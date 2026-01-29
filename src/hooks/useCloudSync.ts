import { useState, useEffect, useCallback, useRef } from 'react';
import { getFigmaToken, getFigmaUser, FigmaUser, getCachedFigmaUser } from '../utils/figma';
import {
  saveProjectToCloud,
  loadProjectsFromCloud,
  deleteProjectFromCloud,
  syncUserProfile,
  isFirebaseEnabled,
} from '../utils/cloudStorage';
import { ProjectData } from '../types';
import { getAllProjects } from '../utils/storage';

export interface CloudSyncStatus {
  isEnabled: boolean;
  isSyncing: boolean;
  lastSynced: number | null;
  error: string | null;
  figmaUser: FigmaUser | null;
  pendingSync: number; // 대기 중인 동기화 작업 수
}

export interface UseCloudSyncReturn {
  status: CloudSyncStatus;
  syncToCloud: (project: ProjectData) => Promise<void>;
  syncFromCloud: () => Promise<ProjectData[]>;
  deleteFromCloud: (projectId: string) => Promise<void>;
  syncAll: () => Promise<void>;
  retryPending: () => Promise<void>;
  reinitialize: () => Promise<void>;
}

// 실패한 동기화 작업을 저장하는 큐
interface PendingSyncItem {
  type: 'save' | 'delete';
  project?: ProjectData;
  projectId?: string;
  timestamp: number;
}

const PENDING_SYNC_KEY = 'figflow_pending_sync';

/**
 * 클라우드 동기화 hook
 *
 * Figma 계정으로 로그인한 사용자의 프로젝트를 Firebase에 동기화합니다.
 *
 * 개선사항:
 * - 실패한 작업 자동 큐잉 및 재시도
 * - 캐시된 유저 정보로 graceful 복구
 * - 로컬 저장 우선 (클라우드 실패해도 로컬은 보장)
 */
export function useCloudSync(): UseCloudSyncReturn {
  const [status, setStatus] = useState<CloudSyncStatus>({
    isEnabled: false,
    isSyncing: false,
    lastSynced: null,
    error: null,
    figmaUser: null,
    pendingSync: 0,
  });

  const pendingQueueRef = useRef<PendingSyncItem[]>([]);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 대기 큐 로드
  const loadPendingQueue = useCallback(() => {
    try {
      const stored = localStorage.getItem(PENDING_SYNC_KEY);
      if (stored) {
        pendingQueueRef.current = JSON.parse(stored);
        setStatus(prev => ({ ...prev, pendingSync: pendingQueueRef.current.length }));
      }
    } catch {
      pendingQueueRef.current = [];
    }
  }, []);

  // 대기 큐 저장
  const savePendingQueue = useCallback(() => {
    try {
      localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(pendingQueueRef.current));
      setStatus(prev => ({ ...prev, pendingSync: pendingQueueRef.current.length }));
    } catch {
      // 저장 실패 무시
    }
  }, []);

  // 대기 큐에 추가
  const addToPendingQueue = useCallback((item: PendingSyncItem) => {
    // 중복 제거 (같은 프로젝트의 이전 작업 삭제)
    const projectKey = item.projectId || item.project?.id;
    pendingQueueRef.current = pendingQueueRef.current.filter(
      p => (p.projectId || p.project?.id) !== projectKey
    );
    pendingQueueRef.current.push(item);
    savePendingQueue();
    console.log('[CloudSync] Added to pending queue:', item.type, projectKey);
  }, [savePendingQueue]);

  // 초기화 함수 (재사용 가능)
  const initCloudSync = useCallback(async () => {
    console.log('[CloudSync] Starting initialization...');
    console.log('[CloudSync] Firebase enabled:', isFirebaseEnabled());

    if (!isFirebaseEnabled()) {
      console.warn('[CloudSync] Firebase not enabled, cloud sync disabled');
      return false;
    }

    const token = getFigmaToken();
    console.log('[CloudSync] Figma token exists:', !!token);

    if (!token) {
      console.log('[CloudSync] No Figma token found, cloud sync disabled');
      return false;
    }

    try {
      console.log('[CloudSync] Fetching Figma user info...');
      const user = await getFigmaUser(token); // 이제 재시도 + 캐시 지원
      console.log('[CloudSync] Figma user result:', user ? user.handle : 'null');

      if (!user) {
        // API 완전 실패 - 캐시도 없음
        console.warn('[CloudSync] Figma user unavailable, trying cached...');

        // 마지막 시도: 직접 캐시 확인
        const cachedUser = getCachedFigmaUser();
        if (cachedUser) {
          console.log('[CloudSync] Using cached user:', cachedUser.handle);
          setStatus((prev) => ({
            ...prev,
            isEnabled: true,
            figmaUser: cachedUser,
            error: '오프라인 모드 (캐시 사용 중)',
          }));
          return true;
        }

        setStatus((prev) => ({
          ...prev,
          isEnabled: false,
          figmaUser: null,
          error: null,
        }));
        return false;
      }

      // 사용자 프로필 동기화 (실패해도 계속 진행)
      try {
        console.log('[CloudSync] Syncing user profile to Firebase...');
        await syncUserProfile(user);
        console.log('[CloudSync] User profile synced successfully');
      } catch (profileError) {
        console.warn('[CloudSync] Profile sync failed, continuing anyway:', profileError);
      }

      setStatus((prev) => ({
        ...prev,
        isEnabled: true,
        figmaUser: user,
        error: null,
      }));

      console.log('[CloudSync] ✅ Cloud sync initialized for user:', user.handle);
      return true;
    } catch (error) {
      console.error('[CloudSync] ❌ Failed to initialize:', error);

      // 초기화 실패 시에도 캐시된 유저로 시도
      const cachedUser = getCachedFigmaUser();
      if (cachedUser) {
        console.log('[CloudSync] Init failed, using cached user:', cachedUser.handle);
        setStatus((prev) => ({
          ...prev,
          isEnabled: true,
          figmaUser: cachedUser,
          error: '연결 불안정 (캐시 사용 중)',
        }));
        return true;
      }

      setStatus((prev) => ({
        ...prev,
        isEnabled: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
      return false;
    }
  }, []);

  // 초기화
  useEffect(() => {
    loadPendingQueue();
    initCloudSync();

    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [initCloudSync, loadPendingQueue]);

  /**
   * 단일 프로젝트를 클라우드에 저장
   *
   * 개선: 실패 시 큐에 추가하고 에러를 throw하지 않음 (로컬 저장은 보장)
   */
  const syncToCloud = useCallback(
    async (project: ProjectData): Promise<void> => {
      // 클라우드 비활성화 시 조용히 큐에 추가
      if (!status.isEnabled || !status.figmaUser) {
        console.log('[CloudSync] Not enabled, queueing for later:', project.id);
        addToPendingQueue({ type: 'save', project, timestamp: Date.now() });
        return; // 에러 throw 안 함
      }

      setStatus((prev) => ({ ...prev, isSyncing: true, error: null }));

      try {
        await saveProjectToCloud(status.figmaUser.id, project);
        setStatus((prev) => ({
          ...prev,
          isSyncing: false,
          lastSynced: Date.now(),
          error: null,
        }));

        // 성공 시 큐에서 제거
        pendingQueueRef.current = pendingQueueRef.current.filter(
          p => (p.projectId || p.project?.id) !== project.id
        );
        savePendingQueue();
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.warn('[CloudSync] Save failed, queueing for retry:', project.id, errorMsg);

        // 실패 시 큐에 추가 (나중에 재시도)
        addToPendingQueue({ type: 'save', project, timestamp: Date.now() });

        setStatus((prev) => ({
          ...prev,
          isSyncing: false,
          error: `동기화 지연됨 (${pendingQueueRef.current.length}개 대기)`,
        }));

        // 30초 후 자동 재시도 예약
        if (!retryTimeoutRef.current) {
          retryTimeoutRef.current = setTimeout(() => {
            retryTimeoutRef.current = null;
            retryPending();
          }, 30000);
        }

        // 에러를 throw하지 않음 - 로컬 저장은 이미 완료됨
      }
    },
    [status.isEnabled, status.figmaUser, addToPendingQueue, savePendingQueue]
  );

  /**
   * 클라우드에서 모든 프로젝트 가져오기
   *
   * 개선: 실패 시 빈 배열 반환 (로컬 프로젝트만 사용하도록)
   */
  const syncFromCloud = useCallback(async (): Promise<ProjectData[]> => {
    if (!status.isEnabled || !status.figmaUser) {
      console.log('[CloudSync] Not enabled, returning empty array');
      return []; // 에러 대신 빈 배열
    }

    setStatus((prev) => ({ ...prev, isSyncing: true, error: null }));

    try {
      const cloudProjects = await loadProjectsFromCloud(status.figmaUser.id);
      setStatus((prev) => ({
        ...prev,
        isSyncing: false,
        lastSynced: Date.now(),
        error: null,
      }));
      return cloudProjects;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.warn('[CloudSync] Load from cloud failed:', errorMsg);
      setStatus((prev) => ({
        ...prev,
        isSyncing: false,
        error: '클라우드 로드 실패 (로컬 데이터 사용)',
      }));
      return []; // 에러 대신 빈 배열 반환
    }
  }, [status.isEnabled, status.figmaUser]);

  /**
   * 클라우드에서 프로젝트 삭제
   *
   * 개선: 실패 시 큐에 추가
   */
  const deleteFromCloud = useCallback(
    async (projectId: string): Promise<void> => {
      if (!status.isEnabled || !status.figmaUser) {
        console.log('[CloudSync] Not enabled, queueing delete for later:', projectId);
        addToPendingQueue({ type: 'delete', projectId, timestamp: Date.now() });
        return;
      }

      setStatus((prev) => ({ ...prev, isSyncing: true, error: null }));

      try {
        await deleteProjectFromCloud(status.figmaUser.id, projectId);
        setStatus((prev) => ({
          ...prev,
          isSyncing: false,
          lastSynced: Date.now(),
        }));

        // 성공 시 큐에서 제거
        pendingQueueRef.current = pendingQueueRef.current.filter(
          p => (p.projectId || p.project?.id) !== projectId
        );
        savePendingQueue();
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        console.warn('[CloudSync] Delete failed, queueing for retry:', projectId, errorMsg);
        addToPendingQueue({ type: 'delete', projectId, timestamp: Date.now() });

        setStatus((prev) => ({
          ...prev,
          isSyncing: false,
          error: `동기화 지연됨 (${pendingQueueRef.current.length}개 대기)`,
        }));
        // 에러 throw 안 함
      }
    },
    [status.isEnabled, status.figmaUser, addToPendingQueue, savePendingQueue]
  );

  /**
   * 모든 로컬 프로젝트를 클라우드에 동기화
   */
  const syncAll = useCallback(async (): Promise<void> => {
    if (!status.isEnabled || !status.figmaUser) {
      console.log('[CloudSync] Not enabled, queueing all projects');
      const localProjects = getAllProjects();
      localProjects.forEach(project => {
        addToPendingQueue({ type: 'save', project, timestamp: Date.now() });
      });
      return;
    }

    setStatus((prev) => ({ ...prev, isSyncing: true, error: null }));

    try {
      const localProjects = getAllProjects();

      // 모든 프로젝트를 병렬로 업로드 (개별 실패 허용)
      const results = await Promise.allSettled(
        localProjects.map((project) =>
          saveProjectToCloud(status.figmaUser!.id, project)
        )
      );

      // 실패한 것들 큐에 추가
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          addToPendingQueue({ type: 'save', project: localProjects[index], timestamp: Date.now() });
        }
      });

      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const failCount = results.length - successCount;

      setStatus((prev) => ({
        ...prev,
        isSyncing: false,
        lastSynced: Date.now(),
        error: failCount > 0 ? `${failCount}개 동기화 지연됨` : null,
      }));

      console.log(`[CloudSync] Synced ${successCount}/${localProjects.length} projects`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('[CloudSync] SyncAll failed:', errorMsg);
      setStatus((prev) => ({
        ...prev,
        isSyncing: false,
        error: errorMsg,
      }));
    }
  }, [status.isEnabled, status.figmaUser, addToPendingQueue]);

  /**
   * 대기 중인 동기화 작업 재시도
   */
  const retryPending = useCallback(async (): Promise<void> => {
    if (!status.isEnabled || !status.figmaUser) {
      console.log('[CloudSync] Cannot retry - not enabled');
      return;
    }

    if (pendingQueueRef.current.length === 0) {
      console.log('[CloudSync] No pending items to retry');
      return;
    }

    console.log(`[CloudSync] Retrying ${pendingQueueRef.current.length} pending items...`);
    setStatus((prev) => ({ ...prev, isSyncing: true }));

    const itemsToRetry = [...pendingQueueRef.current];
    pendingQueueRef.current = []; // 일단 비우고

    for (const item of itemsToRetry) {
      try {
        if (item.type === 'save' && item.project) {
          await saveProjectToCloud(status.figmaUser.id, item.project);
          console.log('[CloudSync] Retry success:', item.project.id);
        } else if (item.type === 'delete' && item.projectId) {
          await deleteProjectFromCloud(status.figmaUser.id, item.projectId);
          console.log('[CloudSync] Retry delete success:', item.projectId);
        }
      } catch (error) {
        console.warn('[CloudSync] Retry failed, re-queueing:', item);
        pendingQueueRef.current.push(item); // 다시 큐에 추가
      }
    }

    savePendingQueue();
    setStatus((prev) => ({
      ...prev,
      isSyncing: false,
      lastSynced: pendingQueueRef.current.length === 0 ? Date.now() : prev.lastSynced,
      error: pendingQueueRef.current.length > 0
        ? `${pendingQueueRef.current.length}개 동기화 대기 중`
        : null,
    }));
  }, [status.isEnabled, status.figmaUser, savePendingQueue]);

  /**
   * 클라우드 동기화 재초기화 (연결 문제 복구용)
   */
  const reinitialize = useCallback(async (): Promise<void> => {
    console.log('[CloudSync] Reinitializing...');
    const success = await initCloudSync();
    if (success && pendingQueueRef.current.length > 0) {
      // 초기화 성공 시 대기 항목 재시도
      setTimeout(() => retryPending(), 1000);
    }
  }, [initCloudSync, retryPending]);

  return {
    status,
    syncToCloud,
    syncFromCloud,
    deleteFromCloud,
    syncAll,
    retryPending,
    reinitialize,
  };
}

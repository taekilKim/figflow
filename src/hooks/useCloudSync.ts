import { useState, useEffect, useCallback } from 'react';
import { getFigmaToken, getFigmaUser, FigmaUser } from '../utils/figma';
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
}

export interface UseCloudSyncReturn {
  status: CloudSyncStatus;
  syncToCloud: (project: ProjectData) => Promise<void>;
  syncFromCloud: () => Promise<ProjectData[]>;
  deleteFromCloud: (projectId: string) => Promise<void>;
  syncAll: () => Promise<void>;
}

/**
 * 클라우드 동기화 hook
 *
 * Figma 계정으로 로그인한 사용자의 프로젝트를 Firebase에 동기화합니다.
 */
export function useCloudSync(): UseCloudSyncReturn {
  const [status, setStatus] = useState<CloudSyncStatus>({
    isEnabled: false,
    isSyncing: false,
    lastSynced: null,
    error: null,
    figmaUser: null,
  });

  // 초기화: Figma 사용자 정보 가져오기
  useEffect(() => {
    const initCloudSync = async () => {
      if (!isFirebaseEnabled()) {
        console.warn('Firebase not enabled, cloud sync disabled');
        return;
      }

      const token = getFigmaToken();
      if (!token) {
        console.log('No Figma token found, cloud sync disabled');
        return;
      }

      try {
        const user = await getFigmaUser(token);
        if (!user) {
          throw new Error('Failed to get Figma user info');
        }

        // 사용자 프로필 동기화
        await syncUserProfile(user);

        setStatus((prev) => ({
          ...prev,
          isEnabled: true,
          figmaUser: user,
          error: null,
        }));

        console.log('Cloud sync initialized for user:', user.handle);
      } catch (error) {
        console.error('Failed to initialize cloud sync:', error);
        setStatus((prev) => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Unknown error',
        }));
      }
    };

    initCloudSync();
  }, []);

  /**
   * 단일 프로젝트를 클라우드에 저장
   */
  const syncToCloud = useCallback(
    async (project: ProjectData): Promise<void> => {
      if (!status.isEnabled || !status.figmaUser) {
        throw new Error('Cloud sync not enabled');
      }

      setStatus((prev) => ({ ...prev, isSyncing: true, error: null }));

      try {
        await saveProjectToCloud(status.figmaUser.id, project);
        setStatus((prev) => ({
          ...prev,
          isSyncing: false,
          lastSynced: Date.now(),
        }));
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        setStatus((prev) => ({
          ...prev,
          isSyncing: false,
          error: errorMsg,
        }));
        throw error;
      }
    },
    [status.isEnabled, status.figmaUser]
  );

  /**
   * 클라우드에서 모든 프로젝트 가져오기
   */
  const syncFromCloud = useCallback(async (): Promise<ProjectData[]> => {
    if (!status.isEnabled || !status.figmaUser) {
      throw new Error('Cloud sync not enabled');
    }

    setStatus((prev) => ({ ...prev, isSyncing: true, error: null }));

    try {
      const cloudProjects = await loadProjectsFromCloud(status.figmaUser.id);
      setStatus((prev) => ({
        ...prev,
        isSyncing: false,
        lastSynced: Date.now(),
      }));
      return cloudProjects;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setStatus((prev) => ({
        ...prev,
        isSyncing: false,
        error: errorMsg,
      }));
      throw error;
    }
  }, [status.isEnabled, status.figmaUser]);

  /**
   * 클라우드에서 프로젝트 삭제
   */
  const deleteFromCloud = useCallback(
    async (projectId: string): Promise<void> => {
      if (!status.isEnabled || !status.figmaUser) {
        throw new Error('Cloud sync not enabled');
      }

      setStatus((prev) => ({ ...prev, isSyncing: true, error: null }));

      try {
        await deleteProjectFromCloud(status.figmaUser.id, projectId);
        setStatus((prev) => ({
          ...prev,
          isSyncing: false,
          lastSynced: Date.now(),
        }));
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        setStatus((prev) => ({
          ...prev,
          isSyncing: false,
          error: errorMsg,
        }));
        throw error;
      }
    },
    [status.isEnabled, status.figmaUser]
  );

  /**
   * 모든 로컬 프로젝트를 클라우드에 동기화
   */
  const syncAll = useCallback(async (): Promise<void> => {
    if (!status.isEnabled || !status.figmaUser) {
      throw new Error('Cloud sync not enabled');
    }

    setStatus((prev) => ({ ...prev, isSyncing: true, error: null }));

    try {
      const localProjects = getAllProjects();

      // 모든 프로젝트를 병렬로 업로드
      await Promise.all(
        localProjects.map((project) =>
          saveProjectToCloud(status.figmaUser!.id, project)
        )
      );

      setStatus((prev) => ({
        ...prev,
        isSyncing: false,
        lastSynced: Date.now(),
      }));

      console.log(`Synced ${localProjects.length} projects to cloud`);
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setStatus((prev) => ({
        ...prev,
        isSyncing: false,
        error: errorMsg,
      }));
      throw error;
    }
  }, [status.isEnabled, status.figmaUser]);

  return {
    status,
    syncToCloud,
    syncFromCloud,
    deleteFromCloud,
    syncAll,
  };
}

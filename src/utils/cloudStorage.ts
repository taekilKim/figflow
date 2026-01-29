import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  collection,
  serverTimestamp,
} from 'firebase/firestore';
import { db, isFirebaseEnabled } from './firebase';
import { ProjectData } from '../types';
import { FigmaUser } from './figma';

/**
 * Firebase에 저장하기 전에 undefined 값을 재귀적으로 제거
 * Firebase Firestore는 undefined 값을 허용하지 않음
 */
function removeUndefined<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => removeUndefined(item)) as T;
  }

  if (typeof obj === 'object') {
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        cleaned[key] = removeUndefined(value);
      }
    }
    return cleaned as T;
  }

  return obj;
}

/**
 * Firebase에 사용자 프로필 동기화
 */
export async function syncUserProfile(figmaUser: FigmaUser): Promise<void> {
  if (!isFirebaseEnabled() || !db) {
    console.warn('Firebase not enabled, skipping user profile sync');
    return;
  }

  try {
    const userRef = doc(db, 'users', figmaUser.id);
    await setDoc(
      userRef,
      {
        handle: figmaUser.handle,
        email: figmaUser.email,
        img_url: figmaUser.img_url,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    console.log('User profile synced successfully');
  } catch (error) {
    console.error('Failed to sync user profile:', error);
    throw error;
  }
}

/**
 * 민감한 Figma 데이터 제거 (개인정보 보호)
 * - fileKey, nodeId, nodeUrl: Figma 파일 접근 정보
 * - thumbnailUrl: 디자인 이미지
 */
function stripSensitiveData(project: ProjectData): ProjectData {
  return {
    ...project,
    nodes: project.nodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        // Figma 참조 정보 제거 (빈 값으로 대체)
        figma: {
          fileKey: '',
          nodeId: '',
          nodeUrl: '',
        },
        meta: {
          ...node.data.meta,
          // 썸네일 URL 제거
          thumbnailUrl: undefined,
          thumbnailUrlLowRes: undefined,
        },
      },
    })),
  };
}

/**
 * Firebase에 프로젝트 저장
 * 주의: 개인정보 보호를 위해 Figma 참조 정보와 썸네일은 저장하지 않음
 */
export async function saveProjectToCloud(
  figmaUserId: string,
  project: ProjectData
): Promise<void> {
  if (!isFirebaseEnabled() || !db) {
    throw new Error('Firebase not enabled');
  }

  try {
    const projectRef = doc(db, 'users', figmaUserId, 'projects', project.id);

    // 민감한 정보 제거
    const safeProject = stripSensitiveData(project);

    // undefined 값 제거 (Firebase는 undefined 허용 안 함)
    const cleanedProject = removeUndefined(safeProject);

    await setDoc(projectRef, {
      ...cleanedProject,
      updatedAt: serverTimestamp(),
    });

    console.log('Project saved to cloud (sensitive data stripped):', project.id);
  } catch (error) {
    console.error('Failed to save project to cloud:', error);
    throw error;
  }
}

/**
 * Firebase에서 모든 프로젝트 로드
 */
export async function loadProjectsFromCloud(
  figmaUserId: string
): Promise<ProjectData[]> {
  if (!isFirebaseEnabled() || !db) {
    throw new Error('Firebase not enabled');
  }

  try {
    const projectsRef = collection(db, 'users', figmaUserId, 'projects');
    const snapshot = await getDocs(projectsRef);

    const projects: ProjectData[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      projects.push({
        id: doc.id,
        name: data.name,
        nodes: data.nodes || [],
        edges: data.edges || [],
        createdAt: data.createdAt || Date.now(),
        updatedAt: data.updatedAt?.toMillis?.() || Date.now(),
      });
    });

    console.log(`Loaded ${projects.length} projects from cloud`);
    return projects;
  } catch (error) {
    console.error('Failed to load projects from cloud:', error);
    throw error;
  }
}

/**
 * Firebase에서 특정 프로젝트 로드
 */
export async function loadProjectFromCloud(
  figmaUserId: string,
  projectId: string
): Promise<ProjectData | null> {
  if (!isFirebaseEnabled() || !db) {
    throw new Error('Firebase not enabled');
  }

  try {
    const projectRef = doc(db, 'users', figmaUserId, 'projects', projectId);
    const snapshot = await getDoc(projectRef);

    if (!snapshot.exists()) {
      return null;
    }

    const data = snapshot.data();
    return {
      id: snapshot.id,
      name: data.name,
      nodes: data.nodes || [],
      edges: data.edges || [],
      createdAt: data.createdAt || Date.now(),
      updatedAt: data.updatedAt?.toMillis?.() || Date.now(),
    };
  } catch (error) {
    console.error('Failed to load project from cloud:', error);
    throw error;
  }
}

/**
 * Firebase에서 프로젝트 삭제
 */
export async function deleteProjectFromCloud(
  figmaUserId: string,
  projectId: string
): Promise<void> {
  if (!isFirebaseEnabled() || !db) {
    throw new Error('Firebase not enabled');
  }

  try {
    const projectRef = doc(db, 'users', figmaUserId, 'projects', projectId);
    await deleteDoc(projectRef);

    console.log('Project deleted from cloud:', projectId);
  } catch (error) {
    console.error('Failed to delete project from cloud:', error);
    throw error;
  }
}

/**
 * Firebase 사용 가능 여부 확인
 */
export { isFirebaseEnabled };

// ============================================
// Admin 통계 함수
// ============================================

export interface AdminStats {
  totalUsers: number;
  totalProjects: number;
  totalNodes: number;
  totalEdges: number;
  users: Array<{
    id: string;
    handle: string;
    email: string;
    img_url: string;
    projectCount: number;
    nodeCount: number;
    updatedAt: number;
  }>;
}

/**
 * 어드민 통계 조회 (모든 사용자, 프로젝트, 노드 수)
 */
export async function getAdminStats(): Promise<AdminStats> {
  if (!isFirebaseEnabled() || !db) {
    throw new Error('Firebase not enabled');
  }

  try {
    // 1. 모든 사용자 조회
    const usersRef = collection(db, 'users');
    const usersSnapshot = await getDocs(usersRef);

    const users: AdminStats['users'] = [];
    let totalProjects = 0;
    let totalNodes = 0;
    let totalEdges = 0;

    // 2. 각 사용자의 프로젝트 조회
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const projectsRef = collection(db, 'users', userDoc.id, 'projects');
      const projectsSnapshot = await getDocs(projectsRef);

      let userNodeCount = 0;
      let userEdgeCount = 0;

      projectsSnapshot.forEach((projectDoc) => {
        const projectData = projectDoc.data();
        const nodeCount = projectData.nodes?.length || 0;
        const edgeCount = projectData.edges?.length || 0;
        userNodeCount += nodeCount;
        userEdgeCount += edgeCount;
      });

      totalProjects += projectsSnapshot.size;
      totalNodes += userNodeCount;
      totalEdges += userEdgeCount;

      users.push({
        id: userDoc.id,
        handle: userData.handle || 'Unknown',
        email: userData.email || '',
        img_url: userData.img_url || '',
        projectCount: projectsSnapshot.size,
        nodeCount: userNodeCount,
        updatedAt: userData.updatedAt?.toMillis?.() || 0,
      });
    }

    // 최근 활동순으로 정렬
    users.sort((a, b) => b.updatedAt - a.updatedAt);

    return {
      totalUsers: usersSnapshot.size,
      totalProjects,
      totalNodes,
      totalEdges,
      users,
    };
  } catch (error) {
    console.error('Failed to get admin stats:', error);
    throw error;
  }
}

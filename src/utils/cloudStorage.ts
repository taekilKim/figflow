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
 * Firebase에 프로젝트 저장
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
    await setDoc(projectRef, {
      ...project,
      updatedAt: serverTimestamp(),
    });

    console.log('Project saved to cloud:', project.id);
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

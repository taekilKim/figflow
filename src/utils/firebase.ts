import { initializeApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';

/**
 * Firebase 설정
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

/**
 * Firestore 데이터 구조
 *
 * users/{figmaUserId}/
 *   - profile: { handle, email, img_url, createdAt, updatedAt }
 *   - projects/{projectId}: { id, name, nodes, edges, createdAt, updatedAt }
 *
 * 사용자 ID는 Figma user ID를 사용하여 계정 연동
 */

// Firebase 초기화
let app: FirebaseApp | undefined;
let db: Firestore | undefined;

try {
  // Firebase 설정이 있는 경우에만 초기화
  if (firebaseConfig.apiKey && firebaseConfig.projectId) {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    console.log('Firebase initialized successfully');
  } else {
    console.warn('Firebase configuration not found. Cloud sync disabled.');
  }
} catch (error) {
  console.error('Firebase initialization error:', error);
}

export { db };
export const isFirebaseEnabled = () => !!db;

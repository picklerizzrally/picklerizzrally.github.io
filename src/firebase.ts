import { initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import {
  initializeFirestore,
  memoryLocalCache,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from "firebase/firestore";
import { firebaseConfig, isConfigured } from "./config";

export const app: FirebaseApp | null = isConfigured ? initializeApp(firebaseConfig) : null;

function makeDb(a: FirebaseApp): Firestore {
  // Offline cache keeps the last scores on screen if a player's signal drops at the court.
  // Some in-app browsers block storage, so fall back to memory instead of crashing.
  try {
    return initializeFirestore(a, {
      ignoreUndefinedProperties: true,
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });
  } catch {
    return initializeFirestore(a, { ignoreUndefinedProperties: true, localCache: memoryLocalCache() });
  }
}

export const db: Firestore | null = app ? makeDb(app) : null;
export const auth: Auth | null = app ? getAuth(app) : null;

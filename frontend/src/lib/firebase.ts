'use client';

import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, connectAuthEmulator, Auth } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator, Firestore } from "firebase/firestore";
import { getStorage, connectStorageEmulator, FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Lazy initialization to prevent SSR issues
let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;
let storage: FirebaseStorage | undefined;

function getFirebaseApp(): FirebaseApp {
  if (typeof window === 'undefined') {
    throw new Error('Firebase cannot be initialized on the server');
  }
  if (!app) {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  }
  return app;
}

function getFirebaseAuth(): Auth {
  if (!auth) {
    auth = getAuth(getFirebaseApp());
    if (process.env.NEXT_PUBLIC_USE_EMULATORS === "true") {
      // @ts-expect-error - global extension for emulator flag
      if (!window._authEmulatorConnected) {
        connectAuthEmulator(auth, "http://127.0.0.1:9099");
        // @ts-expect-error - global extension for emulator flag
        window._authEmulatorConnected = true;
      }
    }
  }
  return auth;
}

function getFirebaseDb(): Firestore {
  if (!db) {
    db = getFirestore(getFirebaseApp());
    if (process.env.NEXT_PUBLIC_USE_EMULATORS === "true") {
      // @ts-expect-error - global extension for emulator flag
      if (!window._firestoreEmulatorConnected) {
        connectFirestoreEmulator(db, "127.0.0.1", 8080);
        // @ts-expect-error - global extension for emulator flag
        window._firestoreEmulatorConnected = true;
      }
    }
  }
  return db;
}

function getFirebaseStorage(): FirebaseStorage {
  if (!storage) {
    storage = getStorage(getFirebaseApp());
    if (process.env.NEXT_PUBLIC_USE_EMULATORS === "true") {
      // @ts-expect-error - global extension for emulator flag
      if (!window._storageEmulatorConnected) {
        connectStorageEmulator(storage, "127.0.0.1", 9199);
        // @ts-expect-error - global extension for emulator flag
        window._storageEmulatorConnected = true;
      }
    }
  }
  return storage;
}

// Export getters that lazily initialize Firebase only on the client
export { getFirebaseApp as app, getFirebaseAuth as auth, getFirebaseDb as db, getFirebaseStorage as storage };

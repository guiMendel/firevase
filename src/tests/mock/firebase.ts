// Import the functions you need from the SDKs you need
import { FirebaseApp, FirebaseOptions, initializeApp } from 'firebase/app'
import { Auth, getAuth } from 'firebase/auth'
import {
  DocumentData,
  DocumentSnapshot,
  Firestore,
  QuerySnapshot,
  getFirestore,
} from 'firebase/firestore'
import { Mock } from 'vitest'

vi.mock('firebase/app')
vi.mock('firebase/auth')
vi.mock('firebase/firestore')

const firebaseConfig: FirebaseOptions = {
  apiKey: 'apiKey',
  authDomain: 'authDomain',
  projectId: 'projectId',
  storageBucket: 'storageBucket',
  messagingSenderId: 'messagingSenderId',
  appId: 'appId',
}

export const mockFirebaseApp = firebaseConfig as FirebaseApp

export const mockAuth = {} as Auth

export const mockDb = {} as Firestore

export const mockDocumentSnapshot = (overrides: Partial<DocumentSnapshot>) =>
  ({
    data: () => ({}),
    exists: false,
    id: '1',
    ...overrides,
  } as DocumentSnapshot)

export const mockQuerySnapshot = (
  items: { id: string; data: DocumentData }[]
) =>
  ({
    empty: items.length == 0,
    size: items.length,
    docs: items.map((item) => ({
      data: () => item.data,
      exists: true,
      id: item.id,
    })),
  } as unknown as QuerySnapshot)

/** Sets up firebase functions for returning mocks.
 * User this when your tests rely on auth and db not being undefined.
 */
export const setUpFirebaseMocks = () => {
  ;(initializeApp as Mock).mockReturnValue(mockFirebaseApp)
  ;(getAuth as Mock).mockReturnValue(mockAuth)
  ;(getFirestore as Mock).mockReturnValue(mockDb)
}

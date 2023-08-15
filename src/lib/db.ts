import { initializeApp } from 'firebase/app';
import {
  deleteDoc,
  doc,
  collection,
  getDoc,
  getFirestore,
  setDoc,
  updateDoc,
  query,
  where,
  getDocs,
  limit,
} from 'firebase/firestore';
import { env } from '~/env.mjs';

export interface UserData {
  email: string;
  username?: string;
}
export interface User {
  email: string;
  id: number;
  username?: string;
}

export interface AuthProps {
  access_token?: string;
  context: string;
  scope?: string;
  user: User;
  storeUrl?:string;
}

const { FIRE_API_KEY, FIRE_DOMAIN, FIRE_PROJECT_ID } = env;

const firebaseConfig = {
  apiKey: FIRE_API_KEY,
  authDomain: FIRE_DOMAIN,
  projectId: FIRE_PROJECT_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Firestore data management functions

// Use setUser for storing global user data (persists between installs)
export async function setUser(user: User) {
  if (!user) return Promise.resolve();

  const { email, id, username } = user;
  const ref = doc(db, 'users', String(id));
  const data: UserData = { email };

  if (username) {
    data.username = username;
  }

  await setDoc(ref, data, { merge: true });
}

export async function setStore(props: AuthProps) {
  const {
    access_token: accessToken,
    context,
    scope,
    user: { id },
    storeUrl,
  } = props;
  // Only set on app install or update
  if (!accessToken || !scope) return null;

  const storeHash = context?.split('/')[1] || '';
  const ref = doc(db, 'store', storeHash);
  const data = { accessToken, adminId: id, scope ,storeUrl};

  await setDoc(ref, data);
}

// User management for multi-user apps
// Use setStoreUser for storing store specific variables
export async function setStoreUser(session: AuthProps) {
  const {
    context,
    user: { id: userId },
  } = session;

  if (!userId) return null;

  const storeHash = context.split('/')[1];
  const documentId = `${userId}_${storeHash}`;
  const ref = doc(db, 'storeUsers', documentId);

  await setDoc(ref, { storeHash });
}

export async function deleteUser(storeHash: string, user: User) {
  const docId = `${user.id}_${storeHash}`;
  const ref = doc(db, 'storeUsers', docId);

  await deleteDoc(ref);
}

export async function getStoreToken(storeHash: string): Promise<string | null> {
  if (!storeHash) return null;
  const storeDoc = await getDoc(doc(db, 'store', storeHash));

  return storeDoc.data()?.accessToken;
}

export async function deleteStore(storeHash: string) {
  const ref = doc(db, 'store', storeHash);
  await deleteDoc(ref);
}

export async function getStoreUrl(params:string) {
  
}


export async function getStoreByUrl(storeUrl:string) { 
  const q = await query(
    collection(db,'store'),
    where("storeUrl","==",storeUrl),
    limit(1),
  )

  const querySnapshot = await getDocs(q);

  const store = querySnapshot.docs[0]

  const storeHash = store ? store.id : ""
  const accessToken = store?.data().accessToken

  return {storeHash,accessToken}
}
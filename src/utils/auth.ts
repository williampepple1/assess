import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import type { User, UserRole } from '../types';

export const createUserProfile = async (uid: string, email: string | null, displayName: string | null, photoURL: string | null) => {
  const userRef = doc(db, 'users', uid);
  const userData: Omit<User, 'uid'> = {
    email,
    displayName,
    photoURL,
    role: 'user' // Default role
  };
  
  await setDoc(userRef, userData);
};

export const getUserProfile = async (uid: string): Promise<User | null> => {
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);
  
  if (userSnap.exists()) {
    return {
      uid,
      ...userSnap.data()
    } as User;
  }
  
  return null;
};

export const updateUserRole = async (uid: string, role: UserRole) => {
  const userRef = doc(db, 'users', uid);
  await setDoc(userRef, { role }, { merge: true });
};

export const isAdmin = async (uid: string): Promise<boolean> => {
  const user = await getUserProfile(uid);
  return user?.role === 'admin';
}; 
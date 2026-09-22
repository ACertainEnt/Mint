import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, Firestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { User, WaitlistEntry, BetaCodeRecord } from '../../src/types';

let firestoreInstance: Firestore | null = null;

try {
  const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  const dbId = (firebaseConfig as any).firestoreDatabaseId;
  firestoreInstance = dbId ? getFirestore(app, dbId) : getFirestore(app);
} catch (err) {
  console.warn('[FirestoreSync] Failed to initialize server Firestore instance:', err);
}

function isPermissionOrAuthError(err: unknown): boolean {
  if (!err) return false;
  const msg = err instanceof Error ? err.message : String(err);
  const code = (err as { code?: string })?.code || '';
  return code === 'permission-denied' || msg.includes('Missing or insufficient permissions') || msg.includes('permission');
}

export const firestoreSync = {
  getDb(): Firestore | null {
    return firestoreInstance;
  },

  /**
   * Check if a waitlist entry exists by ID
   */
  async checkWaitlistEntryExists(entryId: string): Promise<boolean> {
    if (!firestoreInstance) return false;
    try {
      const snap = await getDoc(doc(firestoreInstance, 'waitlist', entryId));
      return snap.exists();
    } catch (err) {
      if (!isPermissionOrAuthError(err)) {
        console.warn(`[FirestoreSync] checkWaitlistEntryExists error for ${entryId}:`, err);
      }
      return false;
    }
  },

  /**
   * Persists a waitlist submission to Firestore
   */
  async saveWaitlistEntry(entry: WaitlistEntry): Promise<void> {
    if (!firestoreInstance) return;
    try {
      await setDoc(doc(firestoreInstance, 'waitlist', entry.id), {
        id: entry.id,
        email: entry.email,
        normalizedEmail: entry.normalizedEmail,
        walletAddress: entry.walletAddress || null,
        roleInterest: entry.roleInterest || null,
        notes: entry.notes || null,
        createdAt: entry.createdAt,
        hasRedeemedBeta: !!entry.hasRedeemedBeta
      }, { merge: true });
    } catch (err) {
      if (!isPermissionOrAuthError(err)) {
        console.warn(`[FirestoreSync] Failed to sync waitlist entry ${entry.id} to Firestore:`, err);
      }
    }
  },

  /**
   * Retrieves all waitlist entries from Firestore
   */
  async getAllWaitlistEntries(): Promise<WaitlistEntry[]> {
    if (!firestoreInstance) return [];
    try {
      const snap = await getDocs(collection(firestoreInstance, 'waitlist'));
      return snap.docs.map(d => d.data() as WaitlistEntry);
    } catch (err) {
      if (!isPermissionOrAuthError(err)) {
        console.warn('[FirestoreSync] Failed to read waitlist entries from Firestore:', err);
      }
      return [];
    }
  },

  /**
   * Persists a beta code record to Firestore
   */
  async saveBetaCode(record: BetaCodeRecord): Promise<void> {
    if (!firestoreInstance) return;
    try {
      await setDoc(doc(firestoreInstance, 'beta_codes', record.id), {
        id: record.id,
        code: record.code,
        status: record.status,
        assignedEmail: record.assignedEmail || null,
        redeemedByUid: record.redeemedByUid || null,
        redeemedByUserId: record.redeemedByUserId || null,
        createdAt: record.createdAt,
        redeemedAt: record.redeemedAt || null,
        expiresAt: record.expiresAt || null,
        createdById: record.createdById || null,
        notes: record.notes || null
      }, { merge: true });
    } catch (err) {
      if (!isPermissionOrAuthError(err)) {
        console.warn(`[FirestoreSync] Failed to sync beta code ${record.id} to Firestore:`, err);
      }
    }
  },

  /**
   * Persists or updates a user profile to Firestore
   */
  async saveUserProfile(user: User): Promise<void> {
    if (!firestoreInstance) return;
    const docId = user.firebaseUid || user.id;
    try {
      await setDoc(doc(firestoreInstance, 'users', docId), {
        id: user.id,
        firebaseUid: user.firebaseUid || null,
        email: user.email || null,
        username: user.username,
        displayName: user.displayName,
        avatar: user.avatar,
        role: user.role,
        isPrivileged: !!user.isPrivileged,
        isVerified: !!user.isVerified,
        beta_access: !!user.beta_access,
        usernameColor: user.usernameColor || null,
        createdAt: user.createdAt,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (err) {
      if (!isPermissionOrAuthError(err)) {
        console.warn(`[FirestoreSync] Failed to sync user profile ${user.id} to Firestore:`, err);
      }
    }
  }
};

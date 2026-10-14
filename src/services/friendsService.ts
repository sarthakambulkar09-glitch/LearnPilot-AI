import type { User } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  where
} from 'firebase/firestore';
import { firestore } from './firebase';
import type { StudySession } from '../types';

export interface FriendProfile {
  uid: string;
  displayName: string;
  friendCode: string;
}

export interface FriendRequest {
  id: string;
  fromUid: string;
  fromName: string;
  fromCode: string;
  toUid: string;
  toName: string;
  toCode: string;
  status: 'pending' | 'accepted' | 'declined';
}

export interface WeeklyStudyScore {
  uid: string;
  displayName: string;
  friendCode: string;
  score: number | null;
  completedSessions: number;
  plannedSessions: number;
  completedMinutes: number;
  plannedMinutes: number;
}

export interface WeeklyStudyStats {
  weekKey: string;
  weekStart: string;
  weekEnd: string;
  score: number;
  completedSessions: number;
  plannedSessions: number;
  completedMinutes: number;
  plannedMinutes: number;
}

function requireFirestore() {
  if (!firestore) {
    throw new Error('Firebase is not configured.');
  }
  return firestore;
}

function makeFriendCode(): string {
  return crypto.randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase();
}

function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function calculateWeeklyStudyStats(
  sessions: StudySession[],
  now = new Date()
): WeeklyStudyStats {
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayOffset = (monday.getDay() + 6) % 7;
  monday.setDate(monday.getDate() - dayOffset);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const weekStart = localDateKey(monday);
  const weekEnd = localDateKey(sunday);
  const weekSessions = sessions.filter(session =>
    session.scheduledDate >= weekStart &&
    session.scheduledDate <= weekEnd &&
    session.type !== 'buffer'
  );
  const completed = weekSessions.filter(session => session.completed);
  const plannedMinutes = weekSessions.reduce(
    (total, session) => total + Math.max(0, Math.round(session.durationMinutes)),
    0
  );
  const completedMinutes = completed.reduce(
    (total, session) => total + Math.max(0, Math.round(session.durationMinutes)),
    0
  );

  return {
    weekKey: weekStart,
    weekStart,
    weekEnd,
    score: plannedMinutes > 0 ? Math.round((completedMinutes / plannedMinutes) * 100) : 0,
    completedSessions: completed.length,
    plannedSessions: weekSessions.length,
    completedMinutes,
    plannedMinutes
  };
}

export async function ensureFriendProfile(user: User, preferredName?: string): Promise<FriendProfile> {
  const db = requireFirestore();
  const profileRef = doc(db, 'profiles', user.uid);
  const current = await getDoc(profileRef);

  if (current.exists()) {
    const profile = current.data();
    return {
      uid: user.uid,
      displayName: profile.displayName as string,
      friendCode: profile.friendCode as string
    };
  }

  const displayName = (preferredName || user.displayName || user.email?.split('@')[0] || 'Student').trim();
  if (!displayName) {
    throw new Error('Please choose a display name before creating your profile.');
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const friendCode = makeFriendCode();
    const codeRef = doc(db, 'friendCodes', friendCode);

    try {
      await runTransaction(db, async transaction => {
        const [existingProfile, existingCode] = await Promise.all([
          transaction.get(profileRef),
          transaction.get(codeRef)
        ]);
        if (existingProfile.exists()) return;
        if (existingCode.exists()) throw new Error('Friend code collision. Retrying profile setup.');

        transaction.set(profileRef, {
          displayName,
          friendCode,
          createdAt: serverTimestamp()
        });
        transaction.set(codeRef, { uid: user.uid, displayName });
      });
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Friend code collision')) continue;
      throw error;
    }

    const created = await getDoc(profileRef);
    if (!created.exists()) {
      throw new Error('Your student profile was not created. Please try again.');
    }
    const profile = created.data();
    return {
      uid: user.uid,
      displayName: profile.displayName as string,
      friendCode: profile.friendCode as string
    };
  }

  throw new Error('Could not create a unique friend code. Please try again.');
}

export async function sendFriendRequest(uid: string, codeInput: string): Promise<void> {
  const db = requireFirestore();
  const code = codeInput.trim().toUpperCase();
  if (!/^[A-F0-9]{12}$/.test(code)) {
    throw new Error('Enter a valid 12-character friend code.');
  }

  const codeSnapshot = await getDoc(doc(db, 'friendCodes', code));
  if (!codeSnapshot.exists()) {
    throw new Error('No student was found for that friend code.');
  }

  const target = codeSnapshot.data() as { uid: string; displayName: string };
  if (target.uid === uid) {
    throw new Error('You cannot add your own account.');
  }

  const friendshipRef = doc(db, 'profiles', uid, 'friends', target.uid);
  if ((await getDoc(friendshipRef)).exists()) {
    throw new Error('You are already connected with this student.');
  }

  const [incoming, outgoing] = await Promise.all([
    getDocs(query(collection(db, 'friendRequests'), where('fromUid', '==', uid), limit(50))),
    getDocs(query(collection(db, 'friendRequests'), where('toUid', '==', uid), limit(50)))
  ]);
  const duplicate = [...incoming.docs, ...outgoing.docs].some(request => {
    const data = request.data();
    return data.status === 'pending' &&
      ((data.fromUid === uid && data.toUid === target.uid) ||
        (data.fromUid === target.uid && data.toUid === uid));
  });
  if (duplicate) {
    throw new Error('A friend request is already waiting for one of you.');
  }

  const requestRef = doc(collection(db, 'friendRequests'));
  const ownProfile = await getDoc(doc(db, 'profiles', uid));
  if (!ownProfile.exists()) throw new Error('Your student profile could not be loaded.');
  if (ownProfile.data().friendCode === code) {
    throw new Error('You cannot add your own account.');
  }

  await setDoc(requestRef, {
    fromUid: uid,
    fromName: ownProfile.data().displayName,
    fromCode: ownProfile.data().friendCode,
    toUid: target.uid,
    toName: codeSnapshot.data().displayName,
    toCode: code,
    status: 'pending',
    createdAt: serverTimestamp()
  });
}

export async function getFriendRequests(uid: string): Promise<{
  incoming: FriendRequest[];
  outgoing: FriendRequest[];
}> {
  const db = requireFirestore();
  const [incoming, outgoing] = await Promise.all([
    getDocs(query(collection(db, 'friendRequests'), where('toUid', '==', uid), limit(50))),
    getDocs(query(collection(db, 'friendRequests'), where('fromUid', '==', uid), limit(50)))
  ]);

  const mapRequests = (snapshot: typeof incoming) =>
    snapshot.docs
      .map(request => ({ id: request.id, ...request.data() } as FriendRequest))
      .filter(request => request.status === 'pending');

  return { incoming: mapRequests(incoming), outgoing: mapRequests(outgoing) };
}

export async function respondToFriendRequest(
  uid: string,
  request: FriendRequest,
  accept: boolean
): Promise<void> {
  const db = requireFirestore();
  const requestRef = doc(db, 'friendRequests', request.id);

  await runTransaction(db, async transaction => {
    const current = await transaction.get(requestRef);
    if (!current.exists()) throw new Error('This friend request no longer exists.');

    const requestData = current.data() as FriendRequest;
    if (requestData.toUid !== uid || requestData.status !== 'pending') {
      throw new Error('This friend request is no longer available.');
    }

    let currentProfileData: Record<string, unknown> | undefined;
    if (accept) {
      const currentProfile = await transaction.get(doc(db, 'profiles', uid));
      if (!currentProfile.exists()) throw new Error('Your student profile could not be loaded.');
      currentProfileData = currentProfile.data();
    }

    transaction.update(requestRef, { status: accept ? 'accepted' : 'declined' });

    if (accept && currentProfileData) {
      const friendEdge = doc(db, 'profiles', uid, 'friends', requestData.fromUid);
      const ownerEdge = doc(db, 'profiles', requestData.fromUid, 'friends', uid);
      transaction.set(friendEdge, {
        uid: requestData.fromUid,
        displayName: requestData.fromName,
        friendCode: requestData.fromCode,
        requestId: request.id,
        since: serverTimestamp()
      });
      transaction.set(ownerEdge, {
        uid,
        displayName: currentProfileData.displayName,
        friendCode: requestData.toCode,
        requestId: request.id,
        since: serverTimestamp()
      });
    }
  });
}

export async function loadWeeklyLeaderboard(
  uid: string,
  profile: FriendProfile,
  stats: WeeklyStudyStats
): Promise<WeeklyStudyScore[]> {
  const db = requireFirestore();
  const ownScoreRef = doc(db, 'profiles', uid, 'weeklyScores', stats.weekKey);
  const friendsSnapshot = await getDocs(collection(db, 'profiles', uid, 'friends'));

  await setDoc(ownScoreRef, {
    weekStart: stats.weekStart,
    weekEnd: stats.weekEnd,
    score: stats.score,
    completedSessions: stats.completedSessions,
    plannedSessions: stats.plannedSessions,
    completedMinutes: stats.completedMinutes,
    plannedMinutes: stats.plannedMinutes,
    updatedAt: serverTimestamp()
  });

  const rows = await Promise.all(
    friendsSnapshot.docs.map(async friendDoc => {
      const friend = friendDoc.data() as FriendProfile;
      const scoreSnapshot = await getDoc(
        doc(db, 'profiles', friend.uid, 'weeklyScores', stats.weekKey)
      );
      if (!scoreSnapshot.exists()) {
        return {
          uid: friend.uid,
          displayName: friend.displayName,
          friendCode: friend.friendCode || '',
          score: null,
          completedSessions: 0,
          plannedSessions: 0,
          completedMinutes: 0,
          plannedMinutes: 0
        };
      }
      const score = scoreSnapshot.data();
      return {
        uid: friend.uid,
        displayName: friend.displayName,
        friendCode: friend.friendCode || '',
        score: score.score as number,
        completedSessions: score.completedSessions as number,
        plannedSessions: score.plannedSessions as number,
        completedMinutes: score.completedMinutes as number,
        plannedMinutes: score.plannedMinutes as number
      };
    })
  );

  rows.push({
    uid,
    displayName: profile.displayName,
    friendCode: profile.friendCode,
    score: stats.score,
    completedSessions: stats.completedSessions,
    plannedSessions: stats.plannedSessions,
    completedMinutes: stats.completedMinutes,
    plannedMinutes: stats.plannedMinutes
  });
  return rows.sort((left, right) =>
    (right.score ?? -1) - (left.score ?? -1) ||
    right.completedMinutes - left.completedMinutes ||
    left.displayName.localeCompare(right.displayName)
  );
}

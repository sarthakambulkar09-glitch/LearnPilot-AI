import React, { useEffect, useMemo, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User
} from 'firebase/auth';
import {
  ArrowDownRight,
  ArrowUpRight,
  Check,
  Copy,
  Crown,
  LogIn,
  LogOut,
  Mail,
  Medal,
  RefreshCw,
  ShieldCheck,
  UserPlus,
  Users
} from 'lucide-react';
import { isFirebaseConfigured, firebaseAuth } from '../services/firebase';
import {
  calculateWeeklyStudyStats,
  ensureFriendProfile,
  getFriendRequests,
  loadWeeklyLeaderboard,
  respondToFriendRequest,
  sendFriendRequest,
  type FriendProfile,
  type FriendRequest,
  type WeeklyStudyScore
} from '../services/friendsService';
import type { StudySession } from '../types';

interface FriendsSectionProps {
  sessions: StudySession[];
}

function getAuthErrorMessage(error: unknown): string {
  const code = error && typeof error === 'object' && 'code' in error && typeof error.code === 'string'
    ? error.code
    : undefined;
  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password') {
    return 'Email or password is incorrect.';
  }
  if (code === 'auth/email-already-in-use') return 'An account already exists for this email.';
  if (code === 'auth/weak-password') return 'Use a password with at least 6 characters.';
  if (code === 'auth/invalid-email') return 'Enter a valid email address.';
  if (code === 'auth/too-many-requests') return 'Too many attempts. Please wait a little and try again.';
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (hours === 0) return `${remainder} min`;
  if (remainder === 0) return `${hours} hr`;
  return `${hours} hr ${remainder} min`;
}

export const FriendsSection: React.FC<FriendsSectionProps> = ({ sessions }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<FriendProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [isRegistering, setIsRegistering] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [friendCode, setFriendCode] = useState('');
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([]);
  const [leaderboard, setLeaderboard] = useState<WeeklyStudyScore[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [copied, setCopied] = useState(false);

  const stats = useMemo(() => calculateWeeklyStudyStats(sessions), [sessions]);

  useEffect(() => {
    const auth = firebaseAuth;
    if (!auth) {
      setProfileLoading(false);
      return;
    }

    let mounted = true;
    const unsubscribe = onAuthStateChanged(auth, async nextUser => {
      setUser(nextUser);
      setProfile(null);
      setError(null);
      setNotice(null);
      if (!nextUser) {
        if (!mounted) return;
        setProfileLoading(false);
        setIncomingRequests([]);
        setOutgoingRequests([]);
        setLeaderboard([]);
        return;
      }

      setProfileLoading(true);
      try {
        const nextProfile = await ensureFriendProfile(nextUser);
        if (mounted && auth.currentUser?.uid === nextUser.uid) {
          setProfile(nextProfile);
        }
      } catch (profileError) {
        if (mounted && auth.currentUser?.uid === nextUser.uid) {
          setError(getAuthErrorMessage(profileError));
        }
      } finally {
        if (mounted && auth.currentUser?.uid === nextUser.uid) {
          setProfileLoading(false);
        }
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user || !profile) return;
    let cancelled = false;
    setIsLoadingData(true);

    Promise.all([
      getFriendRequests(user.uid),
      loadWeeklyLeaderboard(user.uid, profile, stats)
    ])
      .then(([requests, scores]) => {
        if (cancelled) return;
        setIncomingRequests(requests.incoming);
        setOutgoingRequests(requests.outgoing);
        setLeaderboard(scores);
      })
      .catch(loadError => {
        if (!cancelled) setError(getAuthErrorMessage(loadError));
      })
      .finally(() => {
        if (!cancelled) setIsLoadingData(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user, profile, stats, refreshKey]);

  const handleSignIn = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!firebaseAuth) return;
    setIsWorking(true);
    setError(null);
    try {
      await signInWithEmailAndPassword(firebaseAuth, email.trim(), password);
    } catch (authError) {
      setError(getAuthErrorMessage(authError));
    } finally {
      setIsWorking(false);
    }
  };

  const handleCreateAccount = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!firebaseAuth) return;
    if (!displayName.trim()) {
      setError('Enter a display name for your student profile.');
      return;
    }
    setIsWorking(true);
    setError(null);
    try {
      const credential = await createUserWithEmailAndPassword(firebaseAuth, email.trim(), password);
      await updateProfile(credential.user, { displayName: displayName.trim() });
      const nextProfile = await ensureFriendProfile(credential.user, displayName);
      setProfile(nextProfile);
    } catch (authError) {
      setError(getAuthErrorMessage(authError));
    } finally {
      setIsWorking(false);
    }
  };

  const handleAction = async (action: () => Promise<void>, successMessage: string): Promise<boolean> => {
    setIsWorking(true);
    setError(null);
    setNotice(null);
    try {
      await action();
      setNotice(successMessage);
      setRefreshKey(value => value + 1);
      return true;
    } catch (actionError) {
      setError(getAuthErrorMessage(actionError));
      return false;
    } finally {
      setIsWorking(false);
    }
  };

  const handleCopyCode = async () => {
    if (!profile) return;
    try {
      await navigator.clipboard.writeText(profile.friendCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch (copyError) {
      setError(getAuthErrorMessage(copyError));
    }
  };

  const handleSignOut = async () => {
    if (!firebaseAuth) return;
    try {
      await signOut(firebaseAuth);
    } catch (signOutError) {
      setError(getAuthErrorMessage(signOutError));
    }
  };

  if (!isFirebaseConfigured) {
    return (
      <section className="mx-auto max-w-3xl space-y-6">
        <header className="glass-panel-glow flex items-center gap-4 rounded-3xl border border-indigo-500/30 p-6">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-indigo-500/40 bg-indigo-950/80 text-cyan-300">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white">Study Friends</h2>
            <p className="mt-1 text-sm text-slate-400">Connect with classmates and compare weekly study progress.</p>
          </div>
        </header>
        <div className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-5 text-sm text-amber-100">
          <h3 className="font-bold">Connect a Firebase project to enable real friend accounts</h3>
          <p className="mt-2 leading-relaxed text-amber-100/80">
            Add the Firebase web app settings to your local <code className="rounded bg-black/30 px-1.5 py-0.5">.env</code>,
            enable Email/Password sign-in, publish the included Firestore security rules, then restart the app.
            Setup variables are listed in <code className="rounded bg-black/30 px-1.5 py-0.5">.env.example</code>.
          </p>
        </div>
      </section>
    );
  }

  if (profileLoading) {
    return (
      <div className="flex min-h-64 items-center justify-center gap-3 text-sm text-slate-400">
        <RefreshCw className="h-4 w-4 animate-spin text-cyan-400" />
        Connecting your student account…
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <section className="mx-auto max-w-3xl space-y-6">
        <header className="glass-panel-glow flex items-center gap-4 rounded-3xl border border-indigo-500/30 p-6">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-indigo-500/40 bg-indigo-950/80 text-cyan-300">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white">Study Friends</h2>
            <p className="mt-1 text-sm text-slate-400">Create an account or sign in to connect across devices.</p>
          </div>
        </header>

        <form
          onSubmit={isRegistering ? handleCreateAccount : handleSignIn}
          className="glass-panel space-y-4 rounded-3xl border border-slate-800 p-6 sm:p-8"
        >
          <div className="flex items-center justify-between gap-4">
            <h3 className="text-lg font-bold text-white">{isRegistering ? 'Create your student account' : 'Sign in to LearnPilot'}</h3>
            <button
              type="button"
              onClick={() => {
                setIsRegistering(value => !value);
                setError(null);
              }}
              className="text-xs font-semibold text-cyan-300 hover:text-white"
            >
              {isRegistering ? 'Already have an account?' : 'Create account'}
            </button>
          </div>

          {error && <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-950/30 p-3 text-sm text-rose-200">{error}</p>}

          {isRegistering && (
            <label className="block text-xs font-semibold text-slate-300">
              Display name
              <input
                value={displayName}
                onChange={event => setDisplayName(event.target.value)}
                autoComplete="nickname"
                maxLength={40}
                required
                className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-3 text-sm text-white outline-none transition focus:border-indigo-400"
                placeholder="How friends will see you"
              />
            </label>
          )}
          <label className="block text-xs font-semibold text-slate-300">
            Email
            <input
              type="email"
              value={email}
              onChange={event => setEmail(event.target.value)}
              autoComplete="email"
              required
              className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-3 text-sm text-white outline-none transition focus:border-indigo-400"
              placeholder="you@example.com"
            />
          </label>
          <label className="block text-xs font-semibold text-slate-300">
            Password
            <input
              type="password"
              value={password}
              onChange={event => setPassword(event.target.value)}
              autoComplete={isRegistering ? 'new-password' : 'current-password'}
              minLength={6}
              required
              className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-3 text-sm text-white outline-none transition focus:border-indigo-400"
              placeholder="At least 6 characters"
            />
          </label>

          <button
            disabled={isWorking}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 transition hover:brightness-110 disabled:cursor-wait disabled:opacity-60"
          >
            <LogIn className="h-4 w-4" />
            {isWorking ? 'Please wait…' : isRegistering ? 'Create account' : 'Sign in'}
          </button>
          <p className="flex items-start gap-2 text-[11px] leading-relaxed text-slate-500">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
            Your email is used only for sign-in and is not shown on the leaderboard.
          </p>
        </form>
      </section>
    );
  }

  const ownRow = leaderboard.find(row => row.uid === user.uid);
  const currentRank = ownRow ? leaderboard.findIndex(row => row.uid === user.uid) + 1 : 0;
  const weekLabel = `${new Date(`${stats.weekStart}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${new Date(`${stats.weekEnd}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;

  return (
    <section className="mx-auto max-w-5xl space-y-6">
      <header className="glass-panel-glow flex flex-col items-start justify-between gap-5 rounded-3xl border border-indigo-500/30 p-6 sm:flex-row sm:items-center lg:p-7">
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-indigo-500/40 bg-indigo-950/80 text-cyan-300 shadow-lg shadow-indigo-500/20">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white">Study Friends</h2>
            <p className="mt-1 text-xs text-slate-400">A friendly weekly challenge based on your planned study sessions.</p>
          </div>
        </div>
        <button
          onClick={() => void handleSignOut()}
          className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:border-rose-500/50 hover:text-rose-200"
        >
          <LogOut className="h-3.5 w-3.5" /> Sign out
        </button>
      </header>

      {error && <p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-950/30 p-3 text-sm text-rose-200">{error}</p>}
      {notice && <p role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-950/30 p-3 text-sm text-emerald-200">{notice}</p>}

      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-4">
          <div className="glass-panel rounded-2xl border border-cyan-500/20 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Your friend code</div>
                <div className="mt-1 font-mono text-2xl font-extrabold tracking-[0.16em] text-cyan-200">{profile.friendCode}</div>
              </div>
              <button
                onClick={() => void handleCopyCode()}
                className="flex items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-950/30 px-3 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-900/40"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <p className="mt-3 text-xs text-slate-400">Share this code with a friend so they can send you a connection request.</p>
          </div>

          <form
            onSubmit={event => {
              event.preventDefault();
              void handleAction(
                () => sendFriendRequest(user.uid, friendCode),
                'Friend request sent.'
              ).then(succeeded => {
                if (succeeded) setFriendCode('');
              });
            }}
            className="glass-panel space-y-3 rounded-2xl border border-slate-800 p-5"
          >
            <h3 className="flex items-center gap-2 text-sm font-bold text-white">
              <UserPlus className="h-4 w-4 text-violet-300" /> Add a friend
            </h3>
            <label className="sr-only" htmlFor="friend-code">Friend code</label>
            <input
              id="friend-code"
              value={friendCode}
              onChange={event => setFriendCode(event.target.value.toUpperCase())}
              maxLength={12}
              placeholder="Enter their 12-character code"
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-3 font-mono text-sm uppercase tracking-wider text-white outline-none focus:border-violet-400"
            />
            <button
              disabled={isWorking || friendCode.trim().length !== 12}
              className="w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Send friend request
            </button>
          </form>

          <div className="glass-panel rounded-2xl border border-slate-800 p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-bold text-white">
                <Mail className="h-4 w-4 text-amber-300" /> Friend requests
              </h3>
              <button
                onClick={() => setRefreshKey(value => value + 1)}
                title="Refresh friend requests"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isLoadingData ? 'animate-spin' : ''}`} />
              </button>
            </div>
            {incomingRequests.length === 0 && outgoingRequests.length === 0 ? (
              <p className="text-xs text-slate-500">No pending requests. Share your code or add a friend above.</p>
            ) : (
              <div className="space-y-2">
                {incomingRequests.map(request => (
                  <div key={request.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-950/70 p-3">
                    <span className="text-xs text-slate-200">{request.fromName} wants to connect</span>
                    <div className="flex gap-2">
                      <button
                        disabled={isWorking}
                        onClick={() => void handleAction(
                          () => respondToFriendRequest(user.uid, request, true),
                          `You and ${request.fromName} are now connected.`
                        )}
                        className="rounded-lg bg-emerald-600/90 px-2.5 py-1.5 text-[10px] font-bold text-white hover:bg-emerald-500 disabled:opacity-50"
                      >
                        Accept
                      </button>
                      <button
                        disabled={isWorking}
                        onClick={() => void handleAction(
                          () => respondToFriendRequest(user.uid, request, false),
                          'Friend request declined.'
                        )}
                        className="rounded-lg border border-slate-700 px-2.5 py-1.5 text-[10px] font-semibold text-slate-300 hover:bg-slate-800 disabled:opacity-50"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
                {outgoingRequests.map(request => (
                  <div key={request.id} className="rounded-xl border border-slate-800 bg-slate-950/70 p-3 text-xs text-slate-400">
                    Request sent to <span className="font-semibold text-slate-200">{request.toName}</span> · waiting for response
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="glass-panel overflow-hidden rounded-2xl border border-indigo-500/20">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-800 p-5">
            <div>
              <h3 className="flex items-center gap-2 text-base font-bold text-white">
                <Medal className="h-5 w-5 text-amber-300" /> Weekly study leaderboard
              </h3>
              <p className="mt-1 text-xs text-slate-400">{weekLabel} · refresh to sync friends’ latest scores</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setRefreshKey(value => value + 1)}
                title="Refresh leaderboard"
                className="rounded-lg border border-slate-700 bg-slate-900 p-2 text-slate-400 hover:border-indigo-500/40 hover:text-white"
              >
                <RefreshCw className={`h-4 w-4 ${isLoadingData ? 'animate-spin' : ''}`} />
              </button>
              <div className="rounded-xl border border-indigo-500/20 bg-indigo-950/40 px-3 py-2 text-right">
                <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Your place</div>
                <div className="font-mono text-lg font-extrabold text-indigo-200">
                  {currentRank > 0 ? `#${currentRank}` : '—'}
                </div>
              </div>
            </div>
          </div>

          {leaderboard.length === 1 && (
            <div className="border-b border-indigo-500/15 bg-indigo-950/20 px-5 py-3 text-xs text-indigo-100/80">
              Connect with a friend to start your weekly study challenge.
            </div>
          )}

          <div className="divide-y divide-slate-800/80">
            {leaderboard.map((row, index) => {
              const isYou = row.uid === user.uid;
              const score = row.score ?? 0;
              return (
                <div key={row.uid} className={`grid grid-cols-[2rem_minmax(0,1fr)_4rem] items-center gap-3 px-4 py-4 sm:grid-cols-[2.5rem_minmax(0,1fr)_5rem_7rem] sm:px-5 ${isYou ? 'bg-indigo-500/[0.07]' : ''}`}>
                  <div className={`flex h-8 w-8 items-center justify-center rounded-xl border text-xs font-extrabold ${
                    index === 0 ? 'border-amber-400/30 bg-amber-500/10 text-amber-200' :
                    index === 1 ? 'border-slate-400/20 bg-slate-400/10 text-slate-200' :
                    index === 2 ? 'border-orange-500/20 bg-orange-500/10 text-orange-200' :
                    'border-slate-800 bg-slate-900 text-slate-400'
                  }`}>
                    {index === 0 ? <Crown className="h-4 w-4" /> : index + 1}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold text-white">{row.displayName}</span>
                      {isYou && <span className="rounded bg-indigo-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-indigo-200">You</span>}
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-800">
                      <div
                        className={`h-full rounded-full transition-all ${isYou ? 'bg-gradient-to-r from-cyan-400 to-indigo-400' : 'bg-gradient-to-r from-emerald-400 to-teal-400'}`}
                        style={{ width: `${Math.min(100, score)}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-lg font-extrabold text-cyan-200">{row.score === null ? '—' : `${row.score}%`}</div>
                    <div className="text-[9px] text-slate-500">{row.score === null ? 'not logged' : 'study score'}</div>
                  </div>
                  <div className="hidden text-right sm:block">
                    <div className="text-xs font-semibold text-slate-200">{formatMinutes(row.completedMinutes)}</div>
                    <div className="text-[10px] text-slate-500">{row.completedSessions}/{row.plannedSessions} sessions</div>
                  </div>
                </div>
              );
            })}
          </div>

          {leaderboard.length === 0 && (
            <div className="p-8 text-center text-sm text-slate-400">No weekly study data is available yet.</div>
          )}
          <div className="border-t border-slate-800 bg-slate-950/40 px-5 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-cyan-500/15 bg-cyan-950/15 p-3">
                <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Your study score</div>
                <div className="mt-1 flex items-center gap-2">
                  <span className="font-mono text-2xl font-extrabold text-cyan-200">{stats.score}%</span>
                  {stats.score >= (leaderboard[0]?.score || 0) ? <ArrowUpRight className="h-4 w-4 text-emerald-400" /> : <ArrowDownRight className="h-4 w-4 text-amber-400" />}
                </div>
              </div>
              <div className="rounded-xl border border-violet-500/15 bg-violet-950/15 p-3">
                <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Study time</div>
                <div className="mt-1 font-mono text-lg font-bold text-violet-200">{formatMinutes(stats.completedMinutes)}</div>
                <div className="text-[10px] text-slate-500">of {formatMinutes(stats.plannedMinutes)} planned</div>
              </div>
            </div>
            <p className="mt-3 text-[10px] leading-relaxed text-slate-500">
              Study score = completed scheduled minutes ÷ planned minutes for this week. It is a motivational progress measure, not an exam grade. Only these weekly totals are shared with accepted friends.
            </p>
          </div>
          {isLoadingData && (
            <div className="flex items-center justify-center gap-2 border-t border-slate-800 py-3 text-[11px] text-slate-500">
              <RefreshCw className="h-3 w-3 animate-spin" /> Syncing friend scores…
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

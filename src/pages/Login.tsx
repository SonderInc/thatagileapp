import React, { useState, useEffect } from 'react';
import { getAuth, getDataStore } from '../lib/adapters';
import { useStore } from '../store/useStore';
import { SEED_TENANT_ID } from '../utils/mockData';
import type { UserProfile, Role } from '../types';

function getInviteTokenFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  return params.get('invite');
}

const Login: React.FC = () => {
  const { setCurrentTenantId, setCurrentUser } = useStore();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [inviteRecord, setInviteRecord] = useState<{ email: string; companyId: string; roles: string[] } | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);

  useEffect(() => {
    const token = getInviteTokenFromUrl();
    if (!token) return;
    setInviteToken(token);
    if (!getAuth().isConfigured()) {
      setInviteError('Auth not configured');
      return;
    }
    getDataStore().getInviteByToken(token)
      .then((inv) => {
        if (inv) {
          setInviteRecord(inv);
          setEmail(inv.email);
        } else {
          setInviteError('Invalid or expired invite link');
        }
      })
      .catch(() => setInviteError('Could not load invite'));
  }, []);

  const loadProfileAndSetApp = async (uid: string) => {
    try {
      const profile = await getDataStore().getUserProfile(uid);
      if (profile) {
        setCurrentTenantId(profile.companyId ?? SEED_TENANT_ID);
        setCurrentUser({
          id: profile.uid,
          name: profile.displayName,
          email: profile.email,
          roles: profile.companies?.find((c) => c.companyId === (profile.companyId ?? SEED_TENANT_ID))?.roles ?? [],
        });
      } else {
        setCurrentTenantId(SEED_TENANT_ID);
        setCurrentUser({
          id: uid,
          name: displayName || email.split('@')[0],
          email,
          roles: [],
        });
      }
    } catch {
      setCurrentTenantId(SEED_TENANT_ID);
      setCurrentUser({
        id: uid,
        name: displayName || email.split('@')[0],
        email,
        roles: [],
      });
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const auth = getAuth();
    if (!auth.isConfigured()) {
      setError('Auth not configured');
      setLoading(false);
      return;
    }
    try {
      const user = await auth.signInWithEmailAndPassword(email, password);
      await loadProfileAndSetApp(user.uid);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const auth = getAuth();
    if (!auth.isConfigured()) {
      setError('Auth not configured');
      setLoading(false);
      return;
    }
    try {
      const user = await auth.createUserWithEmailAndPassword(email, password);
      if (displayName.trim()) {
        await auth.updateDisplayName(user.uid, displayName.trim());
      }
      const companyId = inviteRecord?.companyId ?? SEED_TENANT_ID;
      const roles = inviteRecord?.roles ?? [];
      const profile: UserProfile = {
        uid: user.uid,
        email: user.email ?? email,
        displayName: (displayName.trim() || user.email?.split('@')[0]) ?? 'User',
        companyId,
        companies: [{ companyId, roles: roles as Role[] }],
      };
      await getDataStore().setUserProfile(profile);
      if (inviteToken) {
        await getDataStore().markInviteUsed(inviteToken);
        setInviteToken(null);
        setInviteRecord(null);
        if (typeof window !== 'undefined') {
          window.history.replaceState({}, '', window.location.pathname + window.location.hash);
        }
      }
      await loadProfileAndSetApp(user.uid);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const isInviteSignUp = inviteToken && inviteRecord;
  const showInviteForm = isInviteSignUp && !inviteError;

  return (
    <div style={{ padding: '24px', maxWidth: '400px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '24px', fontSize: '24px', fontWeight: '600', color: '#111827' }}>
        {showInviteForm ? 'Join with invite' : isSignUp ? 'Create account' : 'Sign in'}
      </h1>
      {inviteError && (
        <div
          style={{
            marginBottom: '16px',
            padding: '12px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            color: '#b91c1c',
            fontSize: '14px',
          }}
        >
          {inviteError}
        </div>
      )}
      {error && (
        <div
          style={{
            marginBottom: '16px',
            padding: '12px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            color: '#b91c1c',
            fontSize: '14px',
          }}
        >
          {error}
        </div>
      )}
      <form onSubmit={(isSignUp || showInviteForm) ? handleSignUp : handleSignIn}>
        {(isSignUp || showInviteForm) && (
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>
              Display name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
              }}
            />
          </div>
        )}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            readOnly={Boolean(showInviteForm)}
            placeholder="you@example.com"
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              ...(showInviteForm && { backgroundColor: '#f3f4f6', cursor: 'not-allowed' }),
            }}
          />
        </div>
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            placeholder="••••••••"
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
            }}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: loading ? '#9ca3af' : '#3b82f6',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: loading ? 'wait' : 'pointer',
          }}
        >
          {loading ? 'Please wait…' : showInviteForm ? 'Create account' : isSignUp ? 'Create account' : 'Sign in'}
        </button>
      </form>
      {!showInviteForm && (
        <p style={{ marginTop: '16px', fontSize: '14px', color: '#6b7280' }}>
          {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
          <button
            type="button"
            onClick={() => { setIsSignUp(!isSignUp); setError(null); }}
            style={{
              background: 'none',
              border: 'none',
              color: '#3b82f6',
              cursor: 'pointer',
              padding: 0,
              fontSize: 'inherit',
            }}
          >
            {isSignUp ? 'Sign in' : 'Create account'}
          </button>
        </p>
      )}
    </div>
  );
};

export default Login;

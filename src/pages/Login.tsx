import React, { useState, useEffect } from 'react';
import { getAuth, getDataStore } from '../lib/adapters';
import { useStore } from '../store/useStore';
import { mergeProfileForBackfill } from '../lib/firestore';
import { isAdminForCompany } from '../lib/roles';
import { SEED_TENANT_ID, isSeedEnabled } from '../utils/mockData';
import type { UserProfile, Role } from '../types';

function getInviteTokenFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  return params.get('invite');
}

const Login: React.FC = () => {
  const { setCurrentTenantId, setCurrentUser, setMustChangePassword } = useStore();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [inviteRecord, setInviteRecord] = useState<{
    email: string;
    companyId: string;
    roles: string[];
    firstName?: string;
    lastName?: string;
    employeeNumber?: string;
    phone?: string;
  } | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const DEFAULT_INVITE_PASSWORD = '12341234';

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
          setPassword(DEFAULT_INVITE_PASSWORD);
          const nameFromInvite = [inv.firstName, inv.lastName].filter(Boolean).join(' ').trim();
          if (nameFromInvite) setDisplayName(nameFromInvite);
        } else {
          setInviteError('Invalid or expired invite link');
        }
      })
      .catch(() => setInviteError('Could not load invite'));
  }, []);

  const loadProfileAndSetApp = async (uid: string) => {
    try {
      const profile = await getDataStore().getUserProfile(uid);
      const fallbackTenantId = isSeedEnabled() ? SEED_TENANT_ID : null;
      if (profile) {
        const tenantId =
          profile.companyId ??
          profile.companyIds?.[0] ??
          profile.companies?.[0]?.companyId ??
          fallbackTenantId;
        if (tenantId === SEED_TENANT_ID && import.meta.env.DEV) {
          console.warn('[Login] Seed fallback active (no company in profile)', { uid });
        }
        const derivedRoles =
          tenantId != null ? (profile.companies?.find((c) => c.companyId === tenantId)?.roles ?? []) : [];
        const isAdmin = tenantId != null ? isAdminForCompany(profile, tenantId) : false;
        const finalRoles =
          isAdmin && !derivedRoles.includes('admin') ? (['admin', ...derivedRoles] as Role[]) : (derivedRoles as Role[]);
        setCurrentTenantId(tenantId);
        setCurrentUser({
          id: profile.uid,
          name: profile.displayName,
          email: profile.email,
          roles: finalRoles,
          appAdmin: profile.appAdmin ?? false,
        });
        if (tenantId != null && tenantId !== SEED_TENANT_ID) {
          const merged = mergeProfileForBackfill(profile, tenantId, finalRoles);
          await getDataStore().setUserProfile(merged).catch((err) => {
            if (import.meta.env.DEV) console.warn('[Login] Backfill setUserProfile failed:', err);
          });
        }
      } else {
        if (fallbackTenantId === SEED_TENANT_ID && import.meta.env.DEV) {
          console.warn('[Login] Seed fallback active (profile null)', { uid });
        }
        setCurrentTenantId(fallbackTenantId);
        setCurrentUser({
          id: uid,
          name: displayName || email.split('@')[0],
          email,
          roles: [],
          appAdmin: false,
        });
      }
    } catch {
      const fallbackTenantId = isSeedEnabled() ? SEED_TENANT_ID : null;
      if (fallbackTenantId === SEED_TENANT_ID && import.meta.env.DEV) {
        console.warn('[Login] Seed fallback active (profile load failed)', { uid });
      }
      setCurrentTenantId(fallbackTenantId);
      setCurrentUser({
        id: uid,
        name: displayName || email.split('@')[0],
        email,
        roles: [],
        appAdmin: false,
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
      const companyId = inviteRecord?.companyId ?? (isSeedEnabled() ? SEED_TENANT_ID : null);
      const roles = inviteRecord?.roles ?? [];
      const displayNameFromInvite = [inviteRecord?.firstName, inviteRecord?.lastName].filter(Boolean).join(' ').trim();
      const hasAdmin = roles.includes('admin');
      const profile: UserProfile = {
        uid: user.uid,
        email: user.email ?? email,
        displayName: displayNameFromInvite || displayName.trim() || user.email?.split('@')[0] || 'User',
        companyId,
        ...(companyId != null && { companyIds: [companyId] }),
        ...(companyId != null && hasAdmin && { adminCompanyIds: [companyId] }),
        companies: companyId != null ? [{ companyId, roles: roles as Role[] }] : [],
        mustChangePassword: true,
        ...(inviteRecord?.employeeNumber && { employeeNumber: inviteRecord.employeeNumber }),
        ...(inviteRecord?.phone && { phone: inviteRecord.phone }),
      };
      await getDataStore().setUserProfile(profile);
      setMustChangePassword(true);
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
          {showInviteForm && (
            <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#6b7280' }}>
              Your temporary password is 12341234. You will be required to change it after signing in.
            </p>
          )}
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            placeholder={showInviteForm ? '12341234' : '••••••••'}
            readOnly={!!showInviteForm}
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

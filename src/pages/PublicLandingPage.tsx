import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { getAuth, getDataStore } from '../lib/adapters';
import { ensureCompanyWorkItem } from '../lib/workItems/resetBacklog';
import Login from './Login';
import type { TenantCompany, UserProfile, Role, CompanyType } from '../types';

const TRIAL_DAYS = 30;
const TRIAL_SEATS = 50;

const PublicLandingPage: React.FC = () => {
  const {
    setViewMode,
    setTenantCompanies,
    setCurrentTenantId,
    setCurrentUser,
    setFirebaseUser,
  } = useStore();
  const [mode, setMode] = useState<'landing' | 'register' | 'login'>('landing');
  const [companyName, setCompanyName] = useState('');
  const [adminName, setAdminName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyType, setCompanyType] = useState<CompanyType>('software');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const auth = getAuth();
    const store = getDataStore();
    if (!auth.isConfigured()) {
      setError('Auth not configured');
      setSaving(false);
      return;
    }
    const name = companyName.trim() || 'New Company';
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') || 'new-company';
    const companyId = `company-${Date.now()}`;
    const now = new Date();
    const trialEndsAt = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
    const company: TenantCompany = {
      id: companyId,
      name,
      slug,
      createdAt: now,
      updatedAt: now,
      trialEndsAt,
      seats: TRIAL_SEATS,
      companyType,
    };
    try {
      const user = await auth.createUserWithEmailAndPassword(email.trim(), password);
      const displayName = adminName.trim() || email.trim().split('@')[0] || 'User';
      await auth.updateDisplayName(user.uid, displayName);
      await store.addTenantCompany(company);
      await ensureCompanyWorkItem(company.id);
      const profile: UserProfile = {
        uid: user.uid,
        email: user.email ?? email.trim(),
        displayName,
        companyId,
        companies: [{ companyId, roles: ['admin' as Role] }],
      };
      await store.setUserProfile(profile);
      const companies = await store.getTenantCompanies();
      setTenantCompanies(companies);
      setCurrentTenantId(companyId);
      setCurrentUser({
        id: user.uid,
        name: displayName,
        email: profile.email,
        roles: ['admin'],
      });
      setFirebaseUser(user);
      setViewMode('landing');
      if (typeof window !== 'undefined') {
        window.history.replaceState(null, '', '/' + company.slug);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      if (import.meta.env.DEV) console.error('[PublicLanding] Register failed:', err);
    } finally {
      setSaving(false);
    }
  };

  if (mode === 'login') {
    return (
      <div style={{ padding: '24px', maxWidth: '400px', margin: '0 auto' }}>
        <p style={{ marginBottom: '16px', fontSize: '14px', color: '#6b7280' }}>
          <button
            type="button"
            onClick={() => setMode('landing')}
            style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: 0, fontSize: 'inherit' }}
          >
            Back
          </button>
        </p>
        <Login />
      </div>
    );
  }

  if (mode === 'register') {
    return (
      <div style={{ padding: '24px', maxWidth: '500px', margin: '0 auto' }}>
        <h1 style={{ marginBottom: '8px', fontSize: '24px', fontWeight: '600', color: '#111827' }}>
          Register your Company
        </h1>
        <p style={{ marginBottom: '24px', fontSize: '14px', color: '#6b7280' }}>
          Create your company and the first admin user. You’ll start a 30-day trial for 50 users.
        </p>
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
        <form onSubmit={handleRegisterSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>Company name *</label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
              placeholder="Acme Inc"
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
            />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>Company type</label>
            <select
              value={companyType}
              onChange={(e) => setCompanyType(e.target.value as CompanyType)}
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
            >
              <option value="software">Software Development</option>
              <option value="training">Training company</option>
            </select>
          </div>
          <div style={{ marginBottom: '16px', paddingTop: '8px', borderTop: '1px solid #e5e7eb' }}>
            <span style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>Admin</span>
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>Admin name *</label>
            <input
              type="text"
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
              required
              placeholder="Your name"
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
            />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>Email *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="admin@company.com"
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
            />
          </div>
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>Password *</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="At least 6 characters"
              style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '14px' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setMode('landing')}
              style={{ padding: '10px 20px', backgroundColor: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '6px', fontWeight: '500', cursor: 'pointer' }}
            >
              Back
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: '10px 20px',
                backgroundColor: saving ? '#9ca3af' : '#3b82f6',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontWeight: '500',
                cursor: saving ? 'not-allowed' : 'pointer',
              }}
            >
              {saving ? 'Creating…' : 'Register'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '520px', margin: '0 auto', textAlign: 'center' }}>
      <h1 style={{ marginBottom: '12px', fontSize: '28px', fontWeight: '700', color: '#111827' }}>
        Register your Company
      </h1>
      <p style={{ marginBottom: '32px', fontSize: '16px', color: '#6b7280', lineHeight: 1.5 }}>
        Create your company and get started. You’ll have full access as admin and start a 30-day trial for 50 users.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
        <button
          type="button"
          onClick={() => setMode('register')}
          style={{
            padding: '14px 28px',
            backgroundColor: '#3b82f6',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
          }}
        >
          Register
        </button>
        <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>
          Already have an account?{' '}
          <button
            type="button"
            onClick={() => setMode('login')}
            style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: 0, fontSize: 'inherit', fontWeight: '500' }}
          >
            Log in
          </button>
        </p>
      </div>
    </div>
  );
};

export default PublicLandingPage;

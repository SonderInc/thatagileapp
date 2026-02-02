import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { getDataStore } from '../lib/adapters';
import type { TenantCompany, UserProfile, Role } from '../types';

const RegisterCompanyPage: React.FC = () => {
  const { firebaseUser, setViewMode, setCurrentTenantId, setTenantCompanies, setCurrentUser, tenantCompanies } = useStore();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    if (!firebaseUser) {
      setError('You must be signed in to register a company.');
      setLoading(false);
      return;
    }
    const companyId = `company-${Date.now()}`;
    const now = new Date();
    const company: TenantCompany = {
      id: companyId,
      name: name.trim() || 'New Company',
      slug: (slug.trim() || name.trim().toLowerCase().replace(/\s+/g, '-')) || 'new-company',
      createdAt: now,
      updatedAt: now,
    };
    try {
      await getDataStore().addTenantCompany(company);
      const profile: UserProfile = {
        uid: firebaseUser.uid,
        email: firebaseUser.email ?? '',
        displayName: (firebaseUser.displayName ?? firebaseUser.email?.split('@')[0]) ?? 'User',
        companyId,
        companies: [{ companyId, roles: ['admin' as Role] }],
      };
      await getDataStore().setUserProfile(profile);
      setTenantCompanies([...tenantCompanies, company]);
      setCurrentTenantId(companyId);
      setCurrentUser({
        id: firebaseUser.uid,
        name: profile.displayName,
        email: profile.email,
        roles: ['admin'],
      });
      setViewMode('landing');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '500px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '24px', fontSize: '24px', fontWeight: '600', color: '#111827' }}>
        Register your company
      </h1>
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
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>
            Company name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Acme Inc"
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
            }}
          />
        </div>
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>
            Slug (URL-friendly)
          </label>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="acme-inc"
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
            padding: '12px 24px',
            backgroundColor: loading ? '#9ca3af' : '#3b82f6',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: loading ? 'wait' : 'pointer',
          }}
        >
          {loading ? 'Creating…' : 'Create company'}
        </button>
      </form>
    </div>
  );
};

export default RegisterCompanyPage;

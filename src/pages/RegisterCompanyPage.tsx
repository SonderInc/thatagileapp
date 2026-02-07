import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { getAuth, getDataStore } from '../lib/adapters';
import { ensureCompanyWorkItem } from '../lib/workItems/resetBacklog';
import type { CompanyType } from '../types';

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/_/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const PROVISION_FN_PATH = '/.netlify/functions/provision-company';

const RegisterCompanyPage: React.FC = () => {
  const { firebaseUser, setViewMode, setCurrentTenantId, setTenantCompanies, setCurrentUser } = useStore();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [companyType, setCompanyType] = useState<CompanyType>('software');
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
    const idToken = await getAuth().getIdToken();
    if (!idToken) {
      setError('You must be signed in to register a company.');
      setLoading(false);
      return;
    }
    const normalizedSlug = slugify(slug.trim() || name);
    if (!normalizedSlug) {
      setError('Slug is required. Use only letters, numbers, and hyphens.');
      setLoading(false);
      return;
    }
    if (!SLUG_PATTERN.test(normalizedSlug)) {
      setError('Slug must be URL-friendly: lowercase letters, numbers, and hyphens only.');
      setLoading(false);
      return;
    }
    const payload = {
      name: name.trim() || 'New Company',
      slug: normalizedSlug,
      companyType,
    };
    if (import.meta.env.DEV) {
      console.log('[RegisterCompanyPage] provisioning request start', payload);
    }
    try {
      const res = await fetch(PROVISION_FN_PATH, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(payload),
      });
      const rawData = await res.json().catch(() => ({}));
      if (import.meta.env.DEV) {
        console.log('[RegisterCompanyPage] provisioning result', { status: res.status, data: rawData });
      }
      if (!res.ok) {
        const errBody = rawData as { error?: string };
        if (res.status === 401) setError('Please sign in again.');
        else if (res.status === 409) setError('This user already belongs to a company.');
        else if (res.status === 400) setError(errBody.error ?? 'Invalid request.');
        else setError(errBody.error ?? 'Could not create company.');
        setLoading(false);
        return;
      }
      const data = rawData as { companyId: string; slug: string };
      const { companyId, slug: returnedSlug } = data;
      const companies = await getDataStore().getTenantCompanies();
      setTenantCompanies(companies);
      await ensureCompanyWorkItem(companyId);
      const displayName = (firebaseUser.displayName ?? firebaseUser.email?.split('@')[0]) ?? 'User';
      const email = firebaseUser.email ?? '';
      setCurrentTenantId(companyId);
      setCurrentUser({
        id: firebaseUser.uid,
        name: displayName,
        email,
        roles: ['admin'],
        appAdmin: false,
      });
      setViewMode('landing');
      if (typeof window !== 'undefined') {
        window.history.replaceState(null, '', '/' + returnedSlug);
      }
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
            onChange={(e) => {
              const next = e.target.value;
              setName(next);
              if (!slugManuallyEdited) setSlug(slugify(next));
            }}
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
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>
            Company type
          </label>
          <select
            value={companyType}
            onChange={(e) => setCompanyType(e.target.value as CompanyType)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
            }}
          >
            <option value="software">Software Development</option>
            <option value="training">Training company</option>
          </select>
        </div>
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>
            Slug (URL-friendly)
          </label>
          <input
            type="text"
            value={slug}
            onChange={(e) => {
              setSlugManuallyEdited(true);
              setSlug(slugify(e.target.value));
            }}
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

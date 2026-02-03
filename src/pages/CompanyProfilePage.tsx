import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { getDataStore, getObjectStore } from '../lib/adapters';

const CompanyProfilePage: React.FC = () => {
  const { getCurrentCompany, setViewMode, setTenantCompanies, currentTenantId } = useStore();
  const company = getCurrentCompany();
  const [name, setName] = useState(company?.name ?? '');
  const [vision, setVision] = useState(company?.vision ?? '');
  const [logoUrl, setLogoUrl] = useState(company?.logoUrl ?? '');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const storageConfigured = getObjectStore().isConfigured();

  useEffect(() => {
    if (company) {
      setName(company.name);
      setVision(company.vision ?? '');
      setLogoUrl(company.logoUrl ?? '');
    }
  }, [company?.id, company?.name, company?.vision, company?.logoUrl]);

  const handleLogoFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentTenantId || !storageConfigured) return;
    setError(null);
    setUploadingLogo(true);
    try {
      const store = getObjectStore();
      const key = await store.upload(currentTenantId, `company-logo-${Date.now()}`, file);
      const url = await store.getUrl(currentTenantId, key);
      setLogoUrl(url);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError('Logo upload failed: ' + msg);
    } finally {
      setUploadingLogo(false);
      e.target.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!currentTenantId) {
      setError('No company selected.');
      return;
    }
    setSaving(true);
    try {
      await getDataStore().updateCompany(currentTenantId, {
        name: name.trim() || company?.name,
        vision: vision.trim() || undefined,
        logoUrl: logoUrl.trim() || undefined,
      });
      const companies = await getDataStore().getTenantCompanies();
      setTenantCompanies(companies);
      setSuccess('Company profile saved.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  if (!company) {
    return (
      <div style={{ padding: '24px', maxWidth: '500px', margin: '0 auto' }}>
        <p style={{ color: '#6b7280' }}>No company loaded.</p>
        <button
          type="button"
          onClick={() => setViewMode('landing')}
          style={{ marginTop: '16px', padding: '8px 16px', cursor: 'pointer' }}
        >
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '500px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '8px', fontSize: '24px', fontWeight: '600', color: '#111827' }}>
        Company profile
      </h1>
      <p style={{ marginBottom: '24px', fontSize: '14px', color: '#6b7280' }}>
        Edit your company name, vision, and logo. Only admins can change these.
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
      {success && (
        <div
          style={{
            marginBottom: '16px',
            padding: '12px',
            backgroundColor: '#d1fae5',
            border: '1px solid #a7f3d0',
            borderRadius: '8px',
            color: '#065f46',
            fontSize: '14px',
          }}
        >
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>
            Logo
          </label>
          {logoUrl && (
            <div style={{ marginBottom: '12px' }}>
              <img
                src={logoUrl}
                alt="Company logo"
                style={{ maxWidth: '120px', maxHeight: '80px', objectFit: 'contain', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
          )}
          {storageConfigured && (
            <div style={{ marginBottom: '8px' }}>
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoFile}
                disabled={uploadingLogo}
                style={{ fontSize: '14px' }}
              />
              {uploadingLogo && <span style={{ marginLeft: '8px', color: '#6b7280', fontSize: '14px' }}>Uploading…</span>}
            </div>
          )}
          <input
            type="url"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="Or paste a logo image URL"
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
            Company name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Your company name"
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
            Vision
          </label>
          <textarea
            value={vision}
            onChange={(e) => setVision(e.target.value)}
            placeholder="Your company vision or mission"
            rows={4}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              resize: 'vertical',
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            type="button"
            onClick={() => setViewMode('landing')}
            style={{
              padding: '10px 20px',
              backgroundColor: '#f3f4f6',
              color: '#374151',
              border: 'none',
              borderRadius: '6px',
              fontWeight: '500',
              cursor: 'pointer',
            }}
          >
            Cancel
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
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CompanyProfilePage;

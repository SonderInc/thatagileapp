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
      <div className="page-container">
        <p className="page-description">No company loaded.</p>
        <button type="button" className="btn-secondary" onClick={() => setViewMode('landing')} style={{ marginTop: '16px' }}>
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className="page-container">
      <h1 className="page-title">Company profile</h1>
      <p className="page-description">
        Edit your company name, vision, and logo. Only admins can change these.
      </p>

      {error && <div className="form-error">{error}</div>}
      {success && <div className="form-success">{success}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Logo</label>
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
              <input type="file" accept="image/*" onChange={handleLogoFile} disabled={uploadingLogo} style={{ fontSize: '14px' }} />
              {uploadingLogo && <span style={{ marginLeft: '8px', color: '#6b7280', fontSize: '14px' }}>Uploading…</span>}
            </div>
          )}
          <input
            type="url"
            className="form-input"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="Or paste a logo image URL"
          />
        </div>
        <div className="form-group">
          <label className="form-label">Company name *</label>
          <input
            type="text"
            className="form-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Your company name"
          />
        </div>
        <div className="form-group" style={{ marginBottom: '24px' }}>
          <label className="form-label">Vision</label>
          <textarea
            className="form-input"
            value={vision}
            onChange={(e) => setVision(e.target.value)}
            placeholder="Your company vision or mission"
            rows={4}
          />
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button type="button" className="btn-secondary" onClick={() => setViewMode('landing')}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CompanyProfilePage;

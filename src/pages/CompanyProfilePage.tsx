import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useStore } from '../store/useStore';
import { getDataStore, getObjectStore } from '../lib/adapters';
import { getResetBacklogPreview, resetBacklog, type ResetBacklogPreview } from '../lib/workItems/resetBacklog';
import type { CompanyType } from '../types';
import Modal from '../components/Modal';

const CONFIRM_RESET_TEXT = 'RESET';

const CompanyProfilePage: React.FC = () => {
  const { getCurrentCompany, setViewMode, setTenantCompanies, tenantCompanies, currentTenantId, setWorkItems, canResetBacklog } = useStore();
  const company = getCurrentCompany();
  const [name, setName] = useState(company?.name ?? '');
  const [companyType, setCompanyType] = useState<CompanyType>(company?.companyType ?? 'software');
  const [vision, setVision] = useState(company?.vision ?? '');
  const [logoUrl, setLogoUrl] = useState(company?.logoUrl ?? '');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetPreview, setResetPreview] = useState<ResetBacklogPreview | null>(null);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [loadingCompany, setLoadingCompany] = useState(false);
  const [loadCompanyFailed, setLoadCompanyFailed] = useState(false);
  const loadAttemptedForTenant = useRef<string | null>(null);
  const storageConfigured = getObjectStore().isConfigured();

  /** Reload companies list and, if still missing, fetch single company by id so Company Profile can show. */
  const loadCompanyIntoStore = useCallback(async () => {
    if (!currentTenantId) return;
    setLoadingCompany(true);
    setLoadCompanyFailed(false);
    try {
      const companies = await getDataStore().getTenantCompanies();
      setTenantCompanies(companies);
      const hasCurrent = companies.some((c) => c.id === currentTenantId);
      if (!hasCurrent) {
        const single = await getDataStore().getCompany(currentTenantId);
        if (single) {
          setTenantCompanies([...companies, single]);
        } else {
          setLoadCompanyFailed(true);
        }
      }
    } catch {
      setLoadCompanyFailed(true);
    } finally {
      setLoadingCompany(false);
    }
  }, [currentTenantId, setTenantCompanies]);

  useEffect(() => {
    if (company) {
      setName(company.name);
      setCompanyType(company.companyType ?? 'software');
      setVision(company.vision ?? '');
      setLogoUrl(company.logoUrl ?? '');
    }
  }, [company?.id, company?.name, company?.companyType, company?.vision, company?.logoUrl]);

  // Reset load attempt when tenant changes so we can retry for the new tenant.
  useEffect(() => {
    loadAttemptedForTenant.current = null;
  }, [currentTenantId]);

  // When we have a tenant id but company not in store (e.g. getTenantCompanies failed), try to load it once.
  useEffect(() => {
    if (!currentTenantId || company || loadingCompany) return;
    if (loadAttemptedForTenant.current === currentTenantId) return;
    loadAttemptedForTenant.current = currentTenantId;
    loadCompanyIntoStore();
  }, [currentTenantId, company, loadingCompany, loadCompanyIntoStore]);

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
      const isPermissionError = /insufficient permissions|403|forbidden|unauthorized/i.test(msg);
      setError(
        isPermissionError
          ? `Logo upload failed: ${msg}. Deploy Storage rules (see storage.rules; run: npx firebase deploy --only storage).`
          : 'Logo upload failed: ' + msg
      );
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
        companyType,
        vision: vision.trim() || undefined,
        logoUrl: logoUrl.trim() || undefined,
      });
      // Update store optimistically so UI reflects changes even if refetch fails (e.g. list permission)
      const updated = {
        name: (name.trim() || company?.name) ?? '',
        companyType,
        vision: vision.trim() || undefined,
        logoUrl: logoUrl.trim() || undefined,
      };
      let nextCompanies = tenantCompanies.map((c) =>
        c.id === currentTenantId ? { ...c, ...updated } : c
      );
      if (!nextCompanies.some((c) => c.id === currentTenantId) && company) {
        nextCompanies = [...nextCompanies, { ...company, ...updated }];
      }
      setTenantCompanies(nextCompanies);
      setSuccess('Company profile saved.');
      // Optionally refetch in background to stay in sync; don't overwrite success on failure
      getDataStore()
        .getTenantCompanies()
        .then(setTenantCompanies)
        .catch(() => {});
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const openResetModal = async () => {
    if (!currentTenantId) return;
    setResetError(null);
    setResetPreview(null);
    setResetConfirmText('');
    setShowResetModal(true);
    try {
      const preview = await getResetBacklogPreview(currentTenantId);
      setResetPreview(preview ?? null);
      if (!preview) setResetError('No Company work item found for this tenant.');
    } catch (err: unknown) {
      setResetError(err instanceof Error ? err.message : String(err));
    }
  };

  const confirmResetBacklog = async () => {
    if (resetConfirmText !== CONFIRM_RESET_TEXT || !currentTenantId || resetLoading) return;
    setResetError(null);
    setResetLoading(true);
    try {
      await resetBacklog(currentTenantId);
      const items = await getDataStore().getWorkItems(currentTenantId);
      setWorkItems(items);
      setSuccess('Backlog reset. All products and their items have been removed.');
      setShowResetModal(false);
    } catch (err: unknown) {
      setResetError(err instanceof Error ? err.message : String(err));
    } finally {
      setResetLoading(false);
    }
  };

  if (!company) {
    const hasTenant = Boolean(currentTenantId);
    return (
      <div className="page-container">
        {hasTenant ? (
          <>
            {loadingCompany && <p className="page-description">Loading…</p>}
            {!loadingCompany && loadCompanyFailed && (
              <p className="page-description">No company loaded. You may not have access to this company, or the list could not be loaded.</p>
            )}
            {!loadingCompany && !loadCompanyFailed && <p className="page-description">Loading…</p>}
            <div style={{ display: 'flex', gap: '12px', marginTop: '16px', flexWrap: 'wrap' }}>
              {loadCompanyFailed && (
                <button type="button" className="btn-primary" onClick={loadCompanyIntoStore} disabled={loadingCompany}>
                  Retry
                </button>
              )}
              <button type="button" className="btn-secondary" onClick={() => setViewMode('landing')}>
                Back to Home
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="page-description">No company loaded.</p>
            <button type="button" className="btn-secondary" onClick={() => setViewMode('landing')} style={{ marginTop: '16px' }}>
              Back to Home
            </button>
          </>
        )}
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
        <div className="form-group">
          <label className="form-label">Company type</label>
          <select
            className="form-input"
            value={companyType}
            onChange={(e) => setCompanyType(e.target.value as CompanyType)}
          >
            <option value="software">Software Development</option>
            <option value="training">Training company</option>
          </select>
          <p className="form-hint" style={{ marginTop: '4px', fontSize: '12px', color: '#6b7280' }}>
            Controls terminology in the app (e.g. Epic vs Program).
          </p>
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

      {canResetBacklog() && (
        <section style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid #e5e7eb' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
            Admin: Reset Backlog
          </h2>
          <p style={{ marginBottom: '12px', fontSize: '14px', color: '#6b7280' }}>
            Permanently remove all Products and their Epics, Features, User Stories, Tasks, and Bugs. The Company work item (name, vision, logo) is kept.
          </p>
          <button
            type="button"
            className="btn-secondary"
            onClick={openResetModal}
            style={{ borderColor: '#dc2626', color: '#dc2626' }}
          >
            Reset Backlog
          </button>
        </section>
      )}

      {showResetModal && (
        <Modal title="Reset Backlog" onClose={() => !resetLoading && setShowResetModal(false)} maxWidth="400px">
          {resetError && <div className="form-error" style={{ marginBottom: '12px' }}>{resetError}</div>}
          {resetPreview && resetPreview.totalCount > 0 && (
            <>
              <p style={{ marginBottom: '12px', fontSize: '14px', color: '#374151' }}>
                The following will be deleted:
              </p>
              <ul style={{ marginBottom: '16px', paddingLeft: '20px', fontSize: '14px', color: '#374151' }}>
                {resetPreview.stats.products > 0 && <li>{resetPreview.stats.products} product(s)</li>}
                {resetPreview.stats.epics > 0 && <li>{resetPreview.stats.epics} epic(s)</li>}
                {resetPreview.stats.features > 0 && <li>{resetPreview.stats.features} feature(s)</li>}
                {resetPreview.stats.userStories > 0 && <li>{resetPreview.stats.userStories} user story(ies)</li>}
                {resetPreview.stats.tasks > 0 && <li>{resetPreview.stats.tasks} task(s)</li>}
                {resetPreview.stats.bugs > 0 && <li>{resetPreview.stats.bugs} bug(s)</li>}
              </ul>
              <p style={{ marginBottom: '12px', fontSize: '14px', color: '#6b7280' }}>
                Total: {resetPreview.totalCount} item(s). Type <strong>{CONFIRM_RESET_TEXT}</strong> to confirm.
              </p>
              <input
                type="text"
                className="form-input"
                value={resetConfirmText}
                onChange={(e) => setResetConfirmText(e.target.value)}
                placeholder={`Type ${CONFIRM_RESET_TEXT}`}
                style={{ marginBottom: '16px' }}
                disabled={resetLoading}
              />
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowResetModal(false)}
                  disabled={resetLoading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={confirmResetBacklog}
                  disabled={resetConfirmText !== CONFIRM_RESET_TEXT || resetLoading}
                  style={resetConfirmText === CONFIRM_RESET_TEXT ? { backgroundColor: '#dc2626' } : undefined}
                >
                  {resetLoading ? 'Resetting…' : 'Reset Backlog'}
                </button>
              </div>
            </>
          )}
          {resetPreview && resetPreview.totalCount === 0 && !resetError && (
            <p style={{ fontSize: '14px', color: '#6b7280' }}>
              No products under the Company. Nothing to reset.
            </p>
          )}
          {!resetPreview && !resetError && (
            <p style={{ fontSize: '14px', color: '#6b7280' }}>Loading…</p>
          )}
        </Modal>
      )}
    </div>
  );
};

export default CompanyProfilePage;

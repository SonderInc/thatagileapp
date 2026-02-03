import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { getDataStore } from '../lib/adapters';

const LicencePage: React.FC = () => {
  const { getCurrentCompany, setViewMode, setTenantCompanies, currentTenantId } = useStore();
  const [licenceKey, setLicenceKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const company = getCurrentCompany();

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const key = licenceKey.trim();
    if (!key || !currentTenantId) {
      setError('Enter a licence key.');
      return;
    }
    setLoading(true);
    try {
      await getDataStore().redeemLicence(currentTenantId, key);
      const companies = await getDataStore().getTenantCompanies();
      setTenantCompanies(companies);
      setSuccess('Licence applied. Your seat limit has been updated.');
      setLicenceKey('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const trialEndsAt = company?.trialEndsAt;
  const trialEndsLabel = trialEndsAt
    ? new Date(trialEndsAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  return (
    <div className="page-container">
      <h1 className="page-title">Licence</h1>
      <p className="page-description">
        Add a licence number to unlock more seats, or buy a licence.
      </p>

      {company && (
        <div
          style={{
            marginBottom: '24px',
            padding: '16px',
            backgroundColor: '#f9fafb',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            fontSize: '14px',
          }}
        >
          <div style={{ marginBottom: '8px' }}>
            <strong>Seats:</strong> {company.seats}
          </div>
          {company.licenseKey && (
            <div style={{ marginBottom: '8px' }}>
              <strong>Licence:</strong> {company.licenseKey}
            </div>
          )}
          {trialEndsLabel && !company.licenseKey && (
            <div>
              <strong>Trial ends:</strong> {trialEndsLabel}
            </div>
          )}
        </div>
      )}

      {error && <div className="form-error">{error}</div>}
      {success && <div className="form-success">{success}</div>}

      <form onSubmit={handleRedeem} style={{ marginBottom: '24px' }}>
        <div className="form-group">
          <label className="form-label">Licence number</label>
          <input
            type="text"
            className="form-input"
            value={licenceKey}
            onChange={(e) => setLicenceKey(e.target.value)}
            placeholder="Enter your licence key"
          />
        </div>
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Applying…' : 'Add licence'}
        </button>
      </form>

      <p className="page-description" style={{ marginBottom: 0 }}>
        <a href="#" style={{ color: '#3b82f6' }}>Buy a licence</a>
        {' '}(coming soon)
      </p>

      <p style={{ marginTop: '24px' }}>
        <button
          type="button"
          onClick={() => setViewMode('landing')}
          style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', padding: 0, fontSize: '14px' }}
        >
          Back to Home
        </button>
      </p>
    </div>
  );
};

export default LicencePage;

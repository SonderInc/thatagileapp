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
    <div style={{ padding: '24px', maxWidth: '500px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '8px', fontSize: '24px', fontWeight: '600', color: '#111827' }}>
        Licence
      </h1>
      <p style={{ marginBottom: '24px', fontSize: '14px', color: '#6b7280' }}>
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

      <form onSubmit={handleRedeem} style={{ marginBottom: '24px' }}>
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>
            Licence number
          </label>
          <input
            type="text"
            value={licenceKey}
            onChange={(e) => setLicenceKey(e.target.value)}
            placeholder="Enter your licence key"
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
            padding: '10px 20px',
            backgroundColor: loading ? '#9ca3af' : '#3b82f6',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            fontWeight: '500',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Applying…' : 'Add licence'}
        </button>
      </form>

      <p style={{ fontSize: '14px', color: '#6b7280' }}>
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

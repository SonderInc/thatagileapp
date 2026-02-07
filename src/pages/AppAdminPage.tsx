import { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { getDataStore } from '../lib/adapters';
import type { TenantCompany } from '../types';

function formatDate(d: Date | undefined): string {
  if (!d) return '—';
  const date = d instanceof Date ? d : new Date(d);
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

const AppAdminPage: React.FC = () => {
  const { currentUser, setViewMode, setCurrentTenantId, tenantCompanies, setTenantCompanies } = useStore();
  const [instances, setInstances] = useState<TenantCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAppAdmin = currentUser?.appAdmin === true;

  useEffect(() => {
    if (!isAppAdmin) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    getDataStore()
      .getTenantCompanies()
      .then((companies) => {
        setInstances(companies);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isAppAdmin]);

  const handleOpen = (companyId: string) => {
    setCurrentTenantId(companyId);
    const inList = tenantCompanies.some((c) => c.id === companyId);
    if (!inList && instances.length > 0) {
      const company = instances.find((c) => c.id === companyId);
      if (company) setTenantCompanies([...tenantCompanies, company]);
    }
    setViewMode('landing');
  };

  if (!isAppAdmin) {
    return (
      <div style={{ padding: '24px' }}>
        <p style={{ color: '#6b7280' }}>Access denied. App Admin is only available to app administrators.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: '24px' }}>
        <p style={{ color: '#6b7280' }}>Loading instances…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '24px' }}>
        <p style={{ color: '#b91c1c' }}>Failed to load instances: {error}</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <h1 style={{ margin: '0 0 16px', fontSize: '24px', fontWeight: 600 }}>App Admin — Instances</h1>
      <p style={{ color: '#6b7280', marginBottom: '24px' }}>
        All tenant companies (instances) that have been created. Click Open to switch into that company.
      </p>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#fff', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <thead>
            <tr style={{ backgroundColor: '#f3f4f6', borderBottom: '1px solid #e5e7eb' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, fontSize: '14px' }}>Name</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, fontSize: '14px' }}>ID</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, fontSize: '14px' }}>Slug</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, fontSize: '14px' }}>Created</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, fontSize: '14px' }}>Trial ends</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, fontSize: '14px' }}>Seats</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, fontSize: '14px' }}>Type</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, fontSize: '14px' }}></th>
            </tr>
          </thead>
          <tbody>
            {instances.map((c) => (
              <tr key={c.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '12px 16px', fontSize: '14px' }}>{c.name}</td>
                <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6b7280', fontFamily: 'monospace' }}>{c.id}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px' }}>{c.slug}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px' }}>{formatDate(c.createdAt)}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px' }}>{formatDate(c.trialEndsAt)}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px' }}>{c.seats}</td>
                <td style={{ padding: '12px 16px', fontSize: '14px' }}>{c.companyType ?? '—'}</td>
                <td style={{ padding: '12px 16px' }}>
                  <button
                    type="button"
                    onClick={() => handleOpen(c.id)}
                    style={{
                      padding: '6px 12px',
                      fontSize: '13px',
                      fontWeight: 500,
                      color: '#2563eb',
                      backgroundColor: 'transparent',
                      border: '1px solid #2563eb',
                      borderRadius: '6px',
                      cursor: 'pointer',
                    }}
                  >
                    Open
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {instances.length === 0 && (
        <p style={{ color: '#6b7280', marginTop: '16px' }}>No instances yet.</p>
      )}
    </div>
  );
};

export default AppAdminPage;

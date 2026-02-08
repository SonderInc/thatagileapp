import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import TerminologySettingsPage from './settings/TerminologySettingsPage';
import LicencePage from './LicencePage';
import ProductHierarchySettingsPage from './settings/ProductHierarchySettingsPage';
import FrameworkPresetsSection from './settings/FrameworkPresetsSection';
import DataSourceSection from './settings/DataSourceSection';

type Section = 'terminology' | 'licence' | 'hierarchy' | 'framework' | 'datasource';

const CompanySettingsPage: React.FC = () => {
  const { setViewMode, setTerminologyProductId, workItems, currentTenantId } = useStore();
  const [section, setSection] = useState<Section>('terminology');
  const [hierarchyProductId, setHierarchyProductId] = useState<string | null>(null);

  useEffect(() => {
    setTerminologyProductId(null);
  }, [setTerminologyProductId]);

  const products = workItems.filter((i) => i.type === 'product' && i.companyId === currentTenantId);

  return (
    <div className="page-container">
      <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => setViewMode('landing')}
        >
          Back to Home
        </button>
        <h1 className="page-title" style={{ margin: 0 }}>
          Company Settings
        </h1>
      </div>

      <div style={{ marginBottom: '24px', display: 'flex', gap: '4px', flexWrap: 'wrap', borderBottom: '1px solid #e5e7eb' }}>
        {(['terminology', 'licence', 'hierarchy', 'framework', 'datasource'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSection(s)}
            style={{
              padding: '10px 16px',
              border: 'none',
              borderBottom: section === s ? '3px solid #3b82f6' : '3px solid transparent',
              backgroundColor: 'transparent',
              color: section === s ? '#3b82f6' : '#6b7280',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: section === s ? '600' : '400',
            }}
          >
            {s === 'terminology' && 'Terminology'}
            {s === 'licence' && 'Licence'}
            {s === 'hierarchy' && 'Hierarchy'}
            {s === 'framework' && 'Framework'}
            {s === 'datasource' && 'Data source'}
          </button>
        ))}
      </div>

      {section === 'terminology' && <TerminologySettingsPage embedInCompanySettings />}
      {section === 'licence' && <LicencePage embedInCompanySettings />}
      {section === 'hierarchy' && (
        <>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
              Product
            </label>
            <select
              value={hierarchyProductId ?? ''}
              onChange={(e) => setHierarchyProductId(e.target.value || null)}
              style={{
                padding: '8px 12px',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                fontSize: '14px',
                minWidth: '240px',
              }}
            >
              <option value="">Select a product…</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>
          <ProductHierarchySettingsPage
            embedInCompanySettings
            overrideProductId={hierarchyProductId ?? undefined}
          />
        </>
      )}
      {section === 'framework' && <FrameworkPresetsSection />}
      {section === 'datasource' && <DataSourceSection />}
    </div>
  );
};

export default CompanySettingsPage;

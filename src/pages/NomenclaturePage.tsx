import React from 'react';
import { useStore } from '../store/useStore';

const NomenclaturePage: React.FC = () => {
  const { setViewMode } = useStore();

  return (
    <div className="page-container">
      <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button type="button" className="btn-secondary" onClick={() => setViewMode('settings')}>
          Back to Settings
        </button>
      </div>
      <h1 className="page-title" style={{ margin: 0 }}>Nomenclature</h1>
      <p className="page-description" style={{ marginTop: '8px' }}>
        Configure work item type labels and terminology for your organization. This will be wired up in a future release.
      </p>
    </div>
  );
};

export default NomenclaturePage;

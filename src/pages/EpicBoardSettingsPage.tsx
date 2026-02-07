import React from 'react';
import { useStore } from '../store/useStore';

const EpicBoardSettingsPage: React.FC = () => {
  const { setViewMode, canAccessTeamBoardSettings } = useStore();

  if (!canAccessTeamBoardSettings()) {
    return (
      <div className="page-container">
        <p className="form-error">You do not have permission to access Epic Board Settings.</p>
        <button type="button" className="btn-secondary" onClick={() => setViewMode('landing')}>
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button type="button" className="btn-secondary" onClick={() => setViewMode('landing')}>
          Back
        </button>
        <h1 className="page-title" style={{ margin: 0 }}>
          Epic Board Settings
        </h1>
      </div>
      <p className="page-description" style={{ marginTop: 0 }}>
        Configure epic board display and behaviour. More options will be available in a future release.
      </p>
    </div>
  );
};

export default EpicBoardSettingsPage;

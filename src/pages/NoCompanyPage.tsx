import React from 'react';
import { useStore } from '../store/useStore';
import { getAuth } from '../lib/adapters';

const NoCompanyPage: React.FC = () => {
  const { viewMode, setFirebaseUser, setCurrentUser, setCurrentTenantId } = useStore();

  const handleSignOut = () => {
    getAuth().signOut().then(() => {
      setFirebaseUser(null);
      setCurrentUser(null);
      setCurrentTenantId(null);
    });
  };

  const handleRetry = () => {
    window.location.reload();
  };

  const isLoadFailed = viewMode === 'account-load-failed';

  return (
    <div className="page-container" style={{ maxWidth: '480px', margin: '0 auto', padding: '24px' }}>
      <h1 className="page-title" style={{ marginBottom: '16px' }}>
        {isLoadFailed ? 'Account load failed' : 'No company associated'}
      </h1>
      <p className="page-description" style={{ marginBottom: '24px', color: '#374151' }}>
        {isLoadFailed
          ? "We couldn't load your account. Please try again or contact support."
          : 'Your account is not associated with a company. If you were invited, use the link from your invitation email. Otherwise contact your administrator.'}
      </p>
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        {isLoadFailed && (
          <button type="button" className="btn-primary" onClick={handleRetry}>
            Retry
          </button>
        )}
        <button type="button" className="btn-secondary" onClick={handleSignOut}>
          Sign out
        </button>
      </div>
    </div>
  );
};

export default NoCompanyPage;

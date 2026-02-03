import React, { useState, useEffect } from 'react';
import {
  getFirebaseConfig,
  hasFirebaseConfigOverride,
  setFirebaseConfigOverride,
  type FirebaseConfig,
} from '../lib/firebaseConfig';

const SettingsPage: React.FC = () => {
  const [override, setOverride] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [projectId, setProjectId] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [authDomain, setAuthDomain] = useState('');
  const [storageBucket, setStorageBucket] = useState('');
  const [messagingSenderId, setMessagingSenderId] = useState('');
  const [appId, setAppId] = useState('');

  useEffect(() => {
    setOverride(hasFirebaseConfigOverride());
    const config = getFirebaseConfig();
    if (config) {
      setProjectId(config.projectId);
      setApiKey(config.apiKey);
      setAuthDomain(config.authDomain);
      setStorageBucket(config.storageBucket ?? '');
      setMessagingSenderId(config.messagingSenderId ?? '');
      setAppId(config.appId ?? '');
    }
  }, []);

  const currentConfig = getFirebaseConfig();

  const handleSave = () => {
    setError(null);
    const pid = projectId.trim();
    const key = apiKey.trim();
    const domain = authDomain.trim();
    if (!pid || !key || !domain) {
      setError('Project ID, API Key, and Auth Domain are required.');
      return;
    }
    const config: FirebaseConfig = {
      projectId: pid,
      apiKey: key,
      authDomain: domain,
    };
    if (storageBucket.trim()) config.storageBucket = storageBucket.trim();
    if (messagingSenderId.trim()) config.messagingSenderId = messagingSenderId.trim();
    if (appId.trim()) config.appId = appId.trim();
    setFirebaseConfigOverride(config);
    window.location.reload();
  };

  const handleClear = () => {
    setFirebaseConfigOverride(null);
    window.location.reload();
  };

  return (
    <div className="page-container">
      <h1 className="page-title">Settings</h1>
      <p className="page-description">
        Configure where your data is stored. You can use ThatAgile Cloud or your own Firebase project.
      </p>

      <section style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
          Data source
        </h2>
        {override ? (
          <div>
            <p style={{ marginBottom: '12px', fontSize: '14px', color: '#374151' }}>
              You&apos;re using <strong>your own database</strong>
              {currentConfig?.projectId && (
                <> (Project ID: <code>{currentConfig.projectId}</code>)</>
              )}.
            </p>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button type="button" className="btn-secondary" onClick={() => setShowForm(true)}>
                Edit
              </button>
              <button type="button" className="btn-secondary" onClick={handleClear}>
                Clear and use ThatAgile Cloud
              </button>
            </div>
          </div>
        ) : (
          <div>
            <p style={{ marginBottom: '12px', fontSize: '14px', color: '#374151' }}>
              You&apos;re using <strong>ThatAgile Cloud</strong>.
            </p>
            <button type="button" className="btn-secondary" onClick={() => setShowForm(true)}>
              Use my own database
            </button>
          </div>
        )}
      </section>

      {showForm && (
        <section style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #e5e7eb' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#374151' }}>
            {override ? 'Edit your Firebase config' : 'Connect your Firebase project'}
          </h2>
          {error && <div className="form-error">{error}</div>}
          <div className="form-group">
            <label className="form-label">Project ID *</label>
            <input
              type="text"
              className="form-input"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              placeholder="my-project-id"
            />
          </div>
          <div className="form-group">
            <label className="form-label">API Key *</label>
            <input
              type="text"
              className="form-input"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIza..."
            />
          </div>
          <div className="form-group">
            <label className="form-label">Auth Domain *</label>
            <input
              type="text"
              className="form-input"
              value={authDomain}
              onChange={(e) => setAuthDomain(e.target.value)}
              placeholder="my-project.firebaseapp.com"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Storage Bucket (optional)</label>
            <input
              type="text"
              className="form-input"
              value={storageBucket}
              onChange={(e) => setStorageBucket(e.target.value)}
              placeholder="my-project.appspot.com"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Messaging Sender ID (optional)</label>
            <input
              type="text"
              className="form-input"
              value={messagingSenderId}
              onChange={(e) => setMessagingSenderId(e.target.value)}
              placeholder="123456789"
            />
          </div>
          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label className="form-label">App ID (optional)</label>
            <input
              type="text"
              className="form-input"
              value={appId}
              onChange={(e) => setAppId(e.target.value)}
              placeholder="1:123456789:web:..."
            />
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button type="button" className="btn-primary" onClick={handleSave}>
              Save
            </button>
            <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
              Cancel
            </button>
          </div>
          <p style={{ marginTop: '12px', fontSize: '13px', color: '#6b7280' }}>
            After saving, the app will reload and use your Firebase project. Get these values from Firebase Console → Project settings → Your apps.
          </p>
        </section>
      )}
    </div>
  );
};

export default SettingsPage;

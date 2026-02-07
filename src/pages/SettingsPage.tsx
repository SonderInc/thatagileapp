import React, { useState, useEffect, useRef } from 'react';
import {
  getFirebaseConfig,
  hasFirebaseConfigOverride,
  setFirebaseConfigOverride,
  type FirebaseConfig,
} from '../lib/firebaseConfig';
import type { KanbanLane } from '../types';
import { useStore } from '../store/useStore';

const KANBAN_LANES_UI: { id: KanbanLane; title: string }[] = [
  { id: 'expedite', title: 'Expedite' },
  { id: 'fixed-delivery-date', title: 'Fixed Delivery Date' },
  { id: 'standard', title: 'Standard' },
  { id: 'intangible', title: 'Intangible' },
];

const SPRINT_START_DAY_LABELS: Record<number, string> = {
  0: 'Sun',
  1: 'Mon',
  2: 'Tue',
  3: 'Wed',
  4: 'Thu',
  5: 'Fri',
  6: 'Sat',
};

const SettingsPage: React.FC = () => {
  const {
    currentTenantId,
    hydrateTeamBoardSettings,
    teamBoardMode,
    sprintLengthWeeks,
    sprintStartDay,
    setTeamBoardMode,
    setSprintLengthWeeks,
    setSprintStartDay,
    setKanbanLanesEnabled,
    canConfigureSprintStart,
    kanbanLanesEnabled,
    setViewMode,
    label,
  } = useStore();
  const [override, setOverride] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [teamBoardSaveMessage, setTeamBoardSaveMessage] = useState<string | null>(null);
  const teamBoardSaveTimeoutRef = useRef<number | null>(null);
  const [projectId, setProjectId] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [authDomain, setAuthDomain] = useState('');
  const [storageBucket, setStorageBucket] = useState('');
  const [messagingSenderId, setMessagingSenderId] = useState('');
  const [appId, setAppId] = useState('');

  useEffect(() => {
    hydrateTeamBoardSettings(currentTenantId);
  }, [currentTenantId, hydrateTeamBoardSettings]);

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

  const handleSaveTeamBoardSettings = () => {
    if (teamBoardSaveTimeoutRef.current) window.clearTimeout(teamBoardSaveTimeoutRef.current);
    setTeamBoardMode(teamBoardMode);
    setSprintLengthWeeks(sprintLengthWeeks);
    setSprintStartDay(sprintStartDay);
    setTeamBoardSaveMessage('Saved!');
    teamBoardSaveTimeoutRef.current = window.setTimeout(() => {
      setTeamBoardSaveMessage(null);
      teamBoardSaveTimeoutRef.current = null;
    }, 2500);
  };

  useEffect(() => {
    return () => {
      if (teamBoardSaveTimeoutRef.current) window.clearTimeout(teamBoardSaveTimeoutRef.current);
    };
  }, []);

  return (
    <div className="page-container">
      <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <button type="button" className="btn-secondary" onClick={() => setViewMode('team-board-settings')}>
          Back to team list
        </button>
      </div>
      <h1 className="page-title">Team Board Settings</h1>
      <p className="page-description">
        Configure where your data is stored. You can use ThatAgile Cloud or your own Firebase project.
      </p>

      <section style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
          Team Board
        </h2>
        <p style={{ marginBottom: '12px', fontSize: '14px', color: '#6b7280' }}>
          Board mode and Scrum options. Kanban board is coming later.
        </p>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>Board mode:</span>
          <button
            type="button"
            onClick={() => setTeamBoardMode('scrum')}
            style={{
              padding: '8px 16px',
              border: teamBoardMode === 'scrum' ? '2px solid #3b82f6' : '1px solid #d1d5db',
              borderRadius: '6px',
              backgroundColor: teamBoardMode === 'scrum' ? '#eff6ff' : '#ffffff',
              color: teamBoardMode === 'scrum' ? '#3b82f6' : '#374151',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: teamBoardMode === 'scrum' ? '600' : '400',
            }}
          >
            Scrum
          </button>
          <button
            type="button"
            onClick={() => setTeamBoardMode('kanban')}
            style={{
              padding: '8px 16px',
              border: teamBoardMode === 'kanban' ? '2px solid #3b82f6' : '1px solid #d1d5db',
              borderRadius: '6px',
              backgroundColor: teamBoardMode === 'kanban' ? '#eff6ff' : '#ffffff',
              color: teamBoardMode === 'kanban' ? '#3b82f6' : '#374151',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: teamBoardMode === 'kanban' ? '600' : '400',
            }}
          >
            Kanban
          </button>
        </div>
        {teamBoardMode === 'kanban' && (
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
              Show lanes on Kanban board
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {KANBAN_LANES_UI.map(({ id, title }) => {
                const isEnabled = kanbanLanesEnabled.includes(id);
                const toggleLane = () => {
                  if (isEnabled && kanbanLanesEnabled.length <= 1) return;
                  const next = isEnabled
                    ? kanbanLanesEnabled.filter((l) => l !== id)
                    : [...kanbanLanesEnabled, id];
                  setKanbanLanesEnabled(next);
                };
                return (
                  <label key={id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: '#374151' }}>
                    <input
                      type="checkbox"
                      checked={isEnabled}
                      onChange={toggleLane}
                      disabled={isEnabled && kanbanLanesEnabled.length <= 1}
                    />
                    {title}
                  </label>
                );
              })}
            </div>
            {kanbanLanesEnabled.length <= 1 && (
              <p style={{ marginTop: '6px', fontSize: '13px', color: '#6b7280' }}>
                At least one lane must be enabled.
              </p>
            )}
          </div>
        )}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
            Sprint length (Scrum)
          </label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {([1, 2, 3, 4] as const).map((weeks) => (
              <button
                key={weeks}
                type="button"
                onClick={() => setSprintLengthWeeks(weeks)}
                style={{
                  padding: '8px 16px',
                  border: sprintLengthWeeks === weeks ? '2px solid #3b82f6' : '1px solid #d1d5db',
                  borderRadius: '6px',
                  backgroundColor: sprintLengthWeeks === weeks ? '#eff6ff' : '#ffffff',
                  color: sprintLengthWeeks === weeks ? '#3b82f6' : '#374151',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                {weeks} {weeks === 1 ? 'week' : 'weeks'}
              </button>
            ))}
          </div>
        </div>
        {canConfigureSprintStart() && (
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
              Sprint start day
            </label>
            <p style={{ marginBottom: '8px', fontSize: '13px', color: '#6b7280' }}>
              {`Only admins and ${label('rte')}/Team of Teams Coach can change this.`}
            </p>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {[0, 1, 2, 3, 4, 5, 6].map((day) => (
                <button
                  key={day}
                  type="button"
                  onClick={() => setSprintStartDay(day)}
                  style={{
                    padding: '8px 12px',
                    border: sprintStartDay === day ? '2px solid #3b82f6' : '1px solid #d1d5db',
                    borderRadius: '6px',
                    backgroundColor: sprintStartDay === day ? '#eff6ff' : '#ffffff',
                    color: sprintStartDay === day ? '#3b82f6' : '#374151',
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                >
                  {SPRINT_START_DAY_LABELS[day]}
                </button>
              ))}
            </div>
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginTop: '16px' }}>
          <button
            type="button"
            onClick={handleSaveTeamBoardSettings}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: '#3b82f6',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
            }}
          >
            Save
          </button>
          {teamBoardSaveMessage && (
            <span style={{ fontSize: '14px', color: '#059669', fontWeight: '500' }}>{teamBoardSaveMessage}</span>
          )}
        </div>
      </section>

      <section style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>
          Terminology
        </h2>
        <p style={{ marginBottom: '12px', fontSize: '14px', color: '#6b7280' }}>
          Choose a framework label pack (e.g. SAFe, LeSS) and override terms. Labels apply across Backlog, Planning Board, and forms.
        </p>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => setViewMode('terminology')}
        >
          Configure terminology
        </button>
      </section>

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

import React, { useState, useEffect, useRef } from 'react';
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
    selectedProductId,
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
    loadFrameworkSettings,
  } = useStore();
  const [teamBoardSaveMessage, setTeamBoardSaveMessage] = useState<string | null>(null);
  const teamBoardSaveTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    hydrateTeamBoardSettings(currentTenantId);
  }, [currentTenantId, hydrateTeamBoardSettings]);

  useEffect(() => {
    if (currentTenantId) loadFrameworkSettings(currentTenantId, selectedProductId ?? undefined);
  }, [currentTenantId, selectedProductId, loadFrameworkSettings]);

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
        <p style={{ marginBottom: '12px', fontSize: '14px', color: '#6b7280' }}>
          Configure company terminology, licence, and hierarchy in{' '}
          <button
            type="button"
            className="btn-secondary"
            style={{ padding: '4px 8px', fontSize: '14px' }}
            onClick={() => setViewMode('company-settings')}
          >
            Company Settings
          </button>
        </p>
      </section>
    </div>
  );
};

export default SettingsPage;

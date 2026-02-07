import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { getDataStore } from '../lib/adapters';
import type { UserProfile } from '../types';
import type { Team } from '../types';

const TeamBoardSettingsListPage: React.FC = () => {
  const {
    teams,
    loadTeams,
    updateTeam,
    setViewMode,
    canAccessTeamBoardSettings,
    currentTenantId,
  } = useStore();
  const [companyUsers, setCompanyUsers] = useState<UserProfile[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [editTeamModal, setEditTeamModal] = useState<Team | null>(null);

  useEffect(() => {
    if (currentTenantId) loadTeams(currentTenantId);
  }, [currentTenantId, loadTeams]);

  useEffect(() => {
    if (!currentTenantId || !editTeamModal) return;
    setUsersLoading(true);
    getDataStore()
      .getCompanyUsers(currentTenantId)
      .then(setCompanyUsers)
      .finally(() => setUsersLoading(false));
  }, [currentTenantId, editTeamModal]);

  const resolveMemberName = (uid: string): string => {
    const p = companyUsers.find((u) => u.uid === uid);
    return p ? (p.displayName || p.email || uid) : uid;
  };

  const handleAddTeamMember = async (teamId: string, uid: string) => {
    const team = teams.find((t) => t.id === teamId);
    if (!team || team.memberIds.includes(uid)) return;
    await updateTeam(teamId, { memberIds: [...team.memberIds, uid] });
  };

  const handleRemoveTeamMember = async (teamId: string, uid: string) => {
    const team = teams.find((t) => t.id === teamId);
    if (!team) return;
    await updateTeam(teamId, { memberIds: team.memberIds.filter((id) => id !== uid) });
  };

  if (!canAccessTeamBoardSettings()) {
    return (
      <div className="page-container">
        <p className="form-error">You do not have permission to access Team Board Settings.</p>
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
          Team Board Settings
        </h1>
      </div>
      <p className="page-description" style={{ marginTop: 0, marginBottom: '24px' }}>
        Select a team to edit its board settings or manage members.
      </p>

      {teams.length === 0 ? (
        <p style={{ color: '#6b7280', fontSize: '14px' }}>No teams yet. Create teams in User Management → Team Management.</p>
      ) : (
        <div style={{ border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ textAlign: 'left', padding: '12px', fontWeight: '600', color: '#374151' }}>Team</th>
                <th style={{ textAlign: 'right', padding: '12px', fontWeight: '600', color: '#374151' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {teams.map((team) => (
                <tr key={team.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '12px', color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {team.name}
                    {team.teamType === 'team-of-teams' && (
                      <span style={{ fontSize: '11px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', padding: '2px 8px', backgroundColor: '#e5e7eb', borderRadius: '4px' }}>
                        Team of Teams
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setViewMode('settings')}
                      style={{ marginRight: '8px' }}
                    >
                      Edit board
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setEditTeamModal(team)}
                    >
                      Edit Team
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editTeamModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setEditTeamModal(null)}
        >
          <div
            style={{
              backgroundColor: '#fff',
              borderRadius: '8px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
              maxWidth: '480px',
              width: '90%',
              maxHeight: '85vh',
              overflow: 'auto',
              padding: '24px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#111827' }}>
                Edit team: {editTeamModal.name}
              </h2>
              <button
                type="button"
                onClick={() => setEditTeamModal(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', color: '#6b7280', padding: '0 4px' }}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            {(() => {
              const liveTeam = teams.find((t) => t.id === editTeamModal.id);
              const memberIds = liveTeam?.memberIds ?? editTeamModal.memberIds;
              return (
                <>
            <div style={{ marginBottom: '12px', fontSize: '13px', color: '#6b7280' }}>
              Members: {memberIds.length === 0 ? 'None' : memberIds.map((uid) => resolveMemberName(uid)).join(', ')}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ fontSize: '13px', color: '#374151' }}>Add member:</span>
              <select
                value=""
                onChange={(e) => {
                  const uid = e.target.value;
                  if (uid) handleAddTeamMember(editTeamModal.id, uid);
                  e.target.value = '';
                }}
                disabled={usersLoading}
                style={{ padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px' }}
              >
                <option value="">Select user…</option>
                {companyUsers
                  .filter((u) => !memberIds.includes(u.uid))
                  .map((u) => (
                    <option key={u.uid} value={u.uid}>
                      {u.displayName || u.email}
                    </option>
                  ))}
              </select>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {memberIds.map((uid) => (
                <span
                  key={uid}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', backgroundColor: '#e5e7eb', borderRadius: '6px', fontSize: '13px' }}
                >
                  {resolveMemberName(uid)}
                  <button
                    type="button"
                    onClick={() => handleRemoveTeamMember(editTeamModal.id, uid)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', color: '#6b7280', fontSize: '14px' }}
                    title="Remove from team"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamBoardSettingsListPage;

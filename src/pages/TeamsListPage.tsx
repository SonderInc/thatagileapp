import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import type { Team } from '../types';

const TeamsListPage: React.FC = () => {
  const {
    currentTenantId,
    teams,
    loadTeams,
    addTeam,
    currentUser,
    setSelectedTeamId,
    setViewMode,
  } = useStore();
  const [newTeamName, setNewTeamName] = useState('');
  const [teamCreating, setTeamCreating] = useState(false);
  const [teamError, setTeamError] = useState<string | null>(null);

  useEffect(() => {
    if (currentTenantId) loadTeams(currentTenantId);
  }, [currentTenantId, loadTeams]);

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTenantId || !newTeamName.trim()) return;
    setTeamError(null);
    setTeamCreating(true);
    try {
      const now = new Date();
      const team: Team = {
        id: `team-${Date.now()}`,
        name: newTeamName.trim(),
        companyId: currentTenantId,
        memberIds: [],
        createdAt: now,
        updatedAt: now,
        createdBy: currentUser?.id,
      };
      await addTeam(team);
      setNewTeamName('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setTeamError(msg);
    } finally {
      setTeamCreating(false);
    }
  };

  const handleOpenTeamBoard = (team: Team) => {
    setSelectedTeamId(team.id);
    setViewMode('team');
  };

  if (!currentTenantId) {
    return (
      <div style={{ padding: '24px' }}>
        <p style={{ color: '#6b7280' }}>Select a company to manage teams.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <h1 style={{ margin: '0 0 8px 0', fontSize: '32px', fontWeight: '700', color: '#111827' }}>
        Teams
      </h1>
      <p style={{ margin: '0 0 24px 0', color: '#6b7280', fontSize: '14px' }}>
        Create teams and open their board by clicking the team name.
      </p>

      <form
        onSubmit={handleCreateTeam}
        style={{ marginBottom: '24px', display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}
      >
        <input
          type="text"
          value={newTeamName}
          onChange={(e) => setNewTeamName(e.target.value)}
          placeholder="Team name"
          style={{
            padding: '8px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '14px',
            minWidth: '200px',
          }}
        />
        <button
          type="submit"
          disabled={teamCreating || !newTeamName.trim()}
          style={{
            padding: '8px 16px',
            backgroundColor: '#3b82f6',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            cursor: teamCreating || !newTeamName.trim() ? 'not-allowed' : 'pointer',
          }}
        >
          {teamCreating ? 'Creating…' : 'Create team'}
        </button>
      </form>
      {teamError && (
        <p style={{ color: '#b91c1c', fontSize: '14px', marginBottom: '16px' }}>{teamError}</p>
      )}

      {teams.length === 0 ? (
        <p style={{ color: '#6b7280', fontSize: '14px' }}>No teams yet. Create one above.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {teams.map((team) => (
            <div
              key={team.id}
              style={{
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '16px',
                backgroundColor: '#fff',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <button
                type="button"
                onClick={() => handleOpenTeamBoard(team)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#3b82f6',
                  textAlign: 'left',
                }}
              >
                {team.name}
              </button>
              <span style={{ fontSize: '13px', color: '#6b7280' }}>
                {team.memberIds.length} member{team.memberIds.length !== 1 ? 's' : ''}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TeamsListPage;

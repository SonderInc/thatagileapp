import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../store/useStore';
import type { Team } from '../types';

type TeamTypeFilter = 'all' | 'team' | 'team-of-teams';

const PAGE_TITLES: Record<'planning' | 'epic' | 'feature' | 'team', string> = {
  planning: 'Planning Boards',
  epic: 'Epic Boards',
  feature: 'Feature Boards',
  team: 'Team Boards',
};

const BoardsDirectoryPage: React.FC = () => {
  const {
    boardsDirectoryType,
    planningBoards,
    teams,
    loadPlanningBoards,
    setSelectedPlanningBoardId,
    setSelectedTeamId,
    setViewMode,
    getTypeLabel,
    currentTenantId,
    selectedPlanningBoardId,
    selectedTeamId,
    viewMode,
  } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [teamTypeFilter, setTeamTypeFilter] = useState<TeamTypeFilter>('all');

  useEffect(() => {
    if (boardsDirectoryType === 'planning' && currentTenantId) {
      loadPlanningBoards(currentTenantId);
    }
  }, [boardsDirectoryType, currentTenantId, loadPlanningBoards]);

  const filteredPlanningBoards = useMemo(() => {
    if (boardsDirectoryType !== 'planning') return [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return planningBoards;
    return planningBoards.filter((b) => b.name.toLowerCase().includes(q));
  }, [boardsDirectoryType, planningBoards, searchQuery]);

  const filteredTeams = useMemo(() => {
    if (boardsDirectoryType !== 'team') return [];
    const q = searchQuery.trim().toLowerCase();
    let list = teams;
    if (teamTypeFilter !== 'all') {
      list = list.filter((t) => (t.teamType ?? 'team') === teamTypeFilter);
    }
    if (!q) return list;
    return list.filter((t) => t.name.toLowerCase().includes(q));
  }, [boardsDirectoryType, teams, searchQuery, teamTypeFilter]);

  if (boardsDirectoryType === null) {
    return (
      <div style={{ padding: '24px' }}>
        <button
          type="button"
          onClick={() => setViewMode('landing')}
          style={{
            marginBottom: '16px',
            padding: '8px 12px',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            background: '#fff',
            color: '#374151',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          ← Back
        </button>
        <p style={{ color: '#6b7280', fontSize: '14px' }}>Select a board type from the Boards menu.</p>
      </div>
    );
  }

  const title = PAGE_TITLES[boardsDirectoryType];

  const handleBack = () => {
    setViewMode('landing');
  };

  return (
    <div style={{ padding: '24px' }}>
      <button
        type="button"
        onClick={handleBack}
        style={{
          marginBottom: '16px',
          padding: '8px 12px',
          border: '1px solid #e5e7eb',
          borderRadius: '6px',
          background: '#fff',
          color: '#374151',
          cursor: 'pointer',
          fontSize: '14px',
        }}
      >
        ← Back
      </button>

      <h1 style={{ margin: '0 0 16px 0', fontSize: '24px', fontWeight: '600', color: '#111827' }}>
        {title}
      </h1>

      {(boardsDirectoryType === 'planning' ||
        boardsDirectoryType === 'epic' ||
        boardsDirectoryType === 'feature' ||
        boardsDirectoryType === 'team') && (
        <input
          type="search"
          placeholder="Search by name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: '100%',
            maxWidth: '320px',
            marginBottom: '16px',
            padding: '10px 12px',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
            fontSize: '14px',
          }}
        />
      )}

      {boardsDirectoryType === 'team' && (
        <div style={{ marginBottom: '16px' }}>
          <label htmlFor="team-type-filter" style={{ marginRight: '8px', fontSize: '14px', color: '#374151' }}>
            Team type:
          </label>
          <select
            id="team-type-filter"
            value={teamTypeFilter}
            onChange={(e) => setTeamTypeFilter(e.target.value as TeamTypeFilter)}
            style={{
              padding: '8px 12px',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              fontSize: '14px',
              backgroundColor: '#fff',
            }}
          >
            <option value="all">All</option>
            <option value="team">Team</option>
            <option value="team-of-teams">Team of Teams</option>
          </select>
        </div>
      )}

      {boardsDirectoryType === 'planning' && (
        <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
          {filteredPlanningBoards.length === 0 ? (
            <li style={{ padding: '12px 0', color: '#6b7280', fontSize: '14px' }}>
              {planningBoards.length === 0 ? 'No planning boards yet.' : 'No boards match your search.'}
            </li>
          ) : (
            filteredPlanningBoards.map((b) => (
              <li
                key={b.id}
                onClick={() => {
                  setSelectedPlanningBoardId(b.id);
                  setViewMode('planning');
                }}
                style={{
                  padding: '12px 16px',
                  marginBottom: '4px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  backgroundColor: selectedPlanningBoardId === b.id && viewMode === 'planning' ? '#eff6ff' : '#fff',
                }}
              >
                <span style={{ fontWeight: '600', color: '#111827' }}>{b.name}</span>
                <span style={{ marginLeft: '8px', fontSize: '12px', color: '#6b7280' }}>{b.teamIds.length} teams</span>
              </li>
            ))
          )}
        </ul>
      )}

      {boardsDirectoryType === 'epic' && (
        <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
          <li
            onClick={() => setViewMode('epic')}
            style={{
              padding: '12px 16px',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              cursor: 'pointer',
              backgroundColor: viewMode === 'epic' ? '#eff6ff' : '#fff',
            }}
          >
            {getTypeLabel('epic')} Board
          </li>
        </ul>
      )}

      {boardsDirectoryType === 'feature' && (
        <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
          <li
            onClick={() => setViewMode('feature')}
            style={{
              padding: '12px 16px',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              cursor: 'pointer',
              backgroundColor: viewMode === 'feature' ? '#eff6ff' : '#fff',
            }}
          >
            {getTypeLabel('feature')} Board
          </li>
        </ul>
      )}

      {boardsDirectoryType === 'team' && (
        <>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
            {filteredTeams.length === 0 ? (
              <li style={{ padding: '12px 0', color: '#6b7280', fontSize: '14px' }}>
                {teams.length === 0 ? 'No teams yet.' : 'No teams match your search.'}
              </li>
            ) : (
              filteredTeams.map((team: Team) => (
                <li
                  key={team.id}
                  onClick={() => {
                    setSelectedTeamId(team.id);
                    setViewMode('team');
                  }}
                  style={{
                    padding: '12px 16px',
                    marginBottom: '4px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    backgroundColor: viewMode === 'team' && team.id === selectedTeamId ? '#eff6ff' : '#fff',
                  }}
                >
                  {team.name}
                  {team.teamType === 'team-of-teams' && (
                    <span style={{ marginLeft: '8px', fontSize: '12px', color: '#6b7280' }}>Team of Teams</span>
                  )}
                </li>
              ))
            )}
          </ul>
          <button
            type="button"
            onClick={() => {
              setSelectedTeamId(null);
              setViewMode('teams-list');
            }}
            style={{
              display: 'block',
              width: '100%',
              maxWidth: '320px',
              marginTop: '16px',
              padding: '10px 16px',
              textAlign: 'left',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              backgroundColor: viewMode === 'teams-list' ? '#eff6ff' : '#fff',
              color: '#374151',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Manage teams
          </button>
        </>
      )}
    </div>
  );
};

export default BoardsDirectoryPage;

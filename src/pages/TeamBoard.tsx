import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../store/useStore';
import TeamKanbanBoard from '../components/TeamKanbanBoard';
import KanbanModeBoard from '../components/KanbanModeBoard';
import WorkItemModal from '../components/WorkItemModal';
import SprintBurndownModal from '../components/SprintBurndownModal';
import { TEAM_BOARD_COLUMNS, KANBAN_BOARD_COLUMNS, getStatusForKanbanColumn } from '../utils/boardConfig';
import { Settings, TrendingDown, ArrowLeft } from 'lucide-react';
import Button from '../components/Button';

const TeamBoard: React.FC = () => {
  const {
    sprints,
    teams,
    selectedTeamId,
    setSelectedTeamId,
    loadTeams,
    getTeamBoardLanes,
    getStoriesForLane,
    getKanbanLanes,
    getItemsForKanbanLane,
    getWorkItemsBySprint,
    selectedWorkItem,
    setSelectedWorkItem,
    currentTenantId,
    hydrateTeamBoardSettings,
    canAccessTeamBoardSettings,
    teamBoardMode,
    setViewMode,
  } = useStore();
  const selectedTeam = selectedTeamId ? teams.find((t) => t.id === selectedTeamId) : null;
  const [showModal, setShowModal] = useState(false);
  const [modalColumnId, setModalColumnId] = useState<string | null>(null);
  const [selectedSprintId, setSelectedSprintId] = useState<string | null>(null);
  const [showBurndown, setShowBurndown] = useState(false);

  useEffect(() => {
    hydrateTeamBoardSettings(currentTenantId);
  }, [currentTenantId, hydrateTeamBoardSettings]);

  useEffect(() => {
    if (currentTenantId && selectedTeamId) loadTeams(currentTenantId);
  }, [currentTenantId, selectedTeamId, loadTeams]);

  const lanes = getTeamBoardLanes();
  const currentSprint = sprints.find((s) => s.status === 'in-progress');
  const upcomingSprints = sprints.filter((s) => s.status === 'upcoming');
  const burndownSprint = selectedSprintId
    ? sprints.find((s) => s.id === selectedSprintId)
    : currentSprint ?? null;

  const burndownProps = useMemo(() => {
    if (!burndownSprint) {
      return { totalStoryPoints: 0, sprintDays: 0 };
    }
    const items = getWorkItemsBySprint(burndownSprint.id);
    const totalStoryPoints = items.reduce(
      (sum, i) => sum + (typeof i.storyPoints === 'number' ? i.storyPoints : 0),
      0
    );
    const start = burndownSprint.startDate instanceof Date
      ? burndownSprint.startDate.getTime()
      : (burndownSprint.startDate as { toMillis?: () => number })?.toMillis?.() ?? 0;
    const end = burndownSprint.endDate instanceof Date
      ? burndownSprint.endDate.getTime()
      : (burndownSprint.endDate as { toMillis?: () => number })?.toMillis?.() ?? 0;
    const sprintDays = Math.max(1, Math.ceil((end - start) / 86400000));
    return { totalStoryPoints, sprintDays };
  }, [burndownSprint, getWorkItemsBySprint]);

  const handleAddItem = (columnId: string) => {
    setModalColumnId(columnId);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setModalColumnId(null);
    setSelectedWorkItem(null);
  };

  const handleBackToTeams = () => {
    setSelectedTeamId(null);
    setViewMode('teams-list');
  };

  if (selectedTeamId == null) {
    return (
      <div style={{ padding: '24px' }}>
        <h1 style={{ margin: '0 0 8px 0', fontSize: '32px', fontWeight: '700', color: '#111827' }}>
          Team Board
        </h1>
        <p style={{ margin: '0 0 16px 0', color: '#6b7280', fontSize: '14px' }}>
          Select a team from the Teams list to view their board.
        </p>
        <button
          type="button"
          onClick={() => setViewMode('teams-list')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            backgroundColor: '#3b82f6',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            cursor: 'pointer',
          }}
        >
          <ArrowLeft size={18} />
          Go to Teams list
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '4px' }}>
            <button
              type="button"
              onClick={handleBackToTeams}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 8px',
                background: 'none',
                border: 'none',
                color: '#6b7280',
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              <ArrowLeft size={16} />
              Back to teams
            </button>
          </div>
          <h1 style={{ margin: 0, fontSize: '32px', fontWeight: '700', color: '#111827' }}>
            Team Board: {selectedTeam?.name ?? 'Team'}
          </h1>
          <p style={{ margin: '8px 0 0 0', color: '#6b7280', fontSize: '14px' }}>
            Sprint-based work management
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {teamBoardMode !== 'kanban' && (
            <Button variant="secondary" onClick={() => setShowBurndown(true)} title="Sprint Burndown">
              <TrendingDown size={18} />
              Sprint Burndown
            </Button>
          )}
          {canAccessTeamBoardSettings() && (
            <Button variant="secondary" onClick={() => setViewMode('settings')} title="Settings">
              <Settings size={20} />
              Settings
            </Button>
          )}
        </div>
      </div>

      {teamBoardMode === 'kanban' ? (
        <KanbanModeBoard
          boardId="team-board-kanban"
          columns={KANBAN_BOARD_COLUMNS}
          lanes={getKanbanLanes()}
          getItemsForLane={getItemsForKanbanLane}
          onAddItem={handleAddItem}
          onOpenItem={() => setShowModal(true)}
        />
      ) : (
        <>
      {/* Sprint Selector */}
      <div style={{ marginBottom: '24px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setSelectedSprintId(null)}
          style={{
            padding: '8px 16px',
            border: selectedSprintId === null ? '2px solid #3b82f6' : '1px solid #d1d5db',
            borderRadius: '6px',
            backgroundColor: selectedSprintId === null ? '#eff6ff' : '#ffffff',
            color: selectedSprintId === null ? '#3b82f6' : '#374151',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: selectedSprintId === null ? '600' : '400',
          }}
        >
          All Items
        </button>
        {currentSprint && (
          <button
            onClick={() => setSelectedSprintId(currentSprint.id)}
            style={{
              padding: '8px 16px',
              border: selectedSprintId === currentSprint.id ? '2px solid #3b82f6' : '1px solid #d1d5db',
              borderRadius: '6px',
              backgroundColor: selectedSprintId === currentSprint.id ? '#eff6ff' : '#ffffff',
              color: selectedSprintId === currentSprint.id ? '#3b82f6' : '#374151',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: selectedSprintId === currentSprint.id ? '600' : '400',
            }}
          >
            {currentSprint.name} (In Progress)
          </button>
        )}
        {upcomingSprints.map((sprint) => (
          <button
            key={sprint.id}
            onClick={() => setSelectedSprintId(sprint.id)}
            style={{
              padding: '8px 16px',
              border: selectedSprintId === sprint.id ? '2px solid #3b82f6' : '1px solid #d1d5db',
              borderRadius: '6px',
              backgroundColor: selectedSprintId === sprint.id ? '#eff6ff' : '#ffffff',
              color: selectedSprintId === sprint.id ? '#3b82f6' : '#374151',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: selectedSprintId === sprint.id ? '600' : '400',
            }}
          >
            {sprint.name} (Upcoming)
          </button>
        ))}
      </div>

      <TeamKanbanBoard
        boardId={`team-board-${selectedSprintId || 'all'}`}
        columns={TEAM_BOARD_COLUMNS}
        lanes={lanes}
        getStoriesForLane={getStoriesForLane}
        onAddItem={handleAddItem}
        onOpenItem={() => setShowModal(true)}
      />
        </>
      )}

      {showModal && (
        <WorkItemModal
          itemId={selectedWorkItem}
          onClose={handleCloseModal}
          type={
            teamBoardMode === 'kanban'
              ? 'task'
              : modalColumnId === 'backlog'
                ? 'user-story'
                : undefined
          }
          allowedTypes={
            teamBoardMode === 'kanban'
              ? ['task']
              : modalColumnId === 'backlog'
                ? ['user-story', 'task', 'bug']
                : undefined
          }
          defaultStatus={
            teamBoardMode === 'kanban' && modalColumnId
              ? getStatusForKanbanColumn(modalColumnId)
              : undefined
          }
          showLaneField={teamBoardMode === 'kanban'}
        />
      )}
      {showBurndown && (
        <SprintBurndownModal
          totalStoryPoints={burndownProps.totalStoryPoints}
          sprintDays={burndownProps.sprintDays}
          onClose={() => setShowBurndown(false)}
        />
      )}
    </div>
  );
};

export default TeamBoard;

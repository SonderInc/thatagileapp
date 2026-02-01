import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import TeamKanbanBoard from '../components/TeamKanbanBoard';
import WorkItemModal from '../components/WorkItemModal';
import { TEAM_BOARD_COLUMNS } from '../utils/boardConfig';
import { Plus } from 'lucide-react';

const TeamBoard: React.FC = () => {
  const {
    sprints,
    getTeamBoardLanes,
    getStoriesForLane,
    selectedWorkItem,
    setSelectedWorkItem,
  } = useStore();
  const [showModal, setShowModal] = useState(false);
  const [modalColumnId, setModalColumnId] = useState<string | null>(null);
  const [selectedSprintId, setSelectedSprintId] = useState<string | null>(null);

  const lanes = getTeamBoardLanes();
  const currentSprint = sprints.find((s) => s.status === 'in-progress');
  const upcomingSprints = sprints.filter((s) => s.status === 'upcoming');

  const handleAddItem = (columnId: string) => {
    setModalColumnId(columnId);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setModalColumnId(null);
    setSelectedWorkItem(null);
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '32px', fontWeight: '700', color: '#111827' }}>
            Team Board
          </h1>
          <p style={{ margin: '8px 0 0 0', color: '#6b7280', fontSize: '14px' }}>
            Sprint-based work management
          </p>
        </div>
        <button
          onClick={() => {
            setModalColumnId(null);
            setShowModal(true);
          }}
          style={{
            padding: '12px 24px',
            backgroundColor: '#3b82f6',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Plus size={20} />
          New User Story
        </button>
      </div>

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

      {showModal && (
        <WorkItemModal
          itemId={selectedWorkItem}
          onClose={handleCloseModal}
          type={modalColumnId ? undefined : 'user-story'}
        />
      )}
    </div>
  );
};

export default TeamBoard;

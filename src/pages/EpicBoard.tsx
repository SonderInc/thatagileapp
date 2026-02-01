import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import KanbanBoard from '../components/KanbanBoard';
import WorkItemModal from '../components/WorkItemModal';
import { EPIC_COLUMNS } from '../utils/boardConfig';
import { Plus } from 'lucide-react';

const EpicBoard: React.FC = () => {
  const { getWorkItemsByType, selectedWorkItem, setSelectedWorkItem } = useStore();
  const [showModal, setShowModal] = useState(false);
  const [modalColumnId, setModalColumnId] = useState<string | null>(null);
  
  const epics = getWorkItemsByType('epic');

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
            Epic Board
          </h1>
          <p style={{ margin: '8px 0 0 0', color: '#6b7280', fontSize: '14px' }}>
            Manage epics across the value stream
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
          New Epic
        </button>
      </div>

      <KanbanBoard
        boardId="epic-board"
        columns={EPIC_COLUMNS}
        workItems={epics}
        onAddItem={handleAddItem}
      />

      {showModal && (
        <WorkItemModal
          itemId={selectedWorkItem}
          onClose={handleCloseModal}
          type={modalColumnId ? undefined : 'epic'}
        />
      )}
    </div>
  );
};

export default EpicBoard;

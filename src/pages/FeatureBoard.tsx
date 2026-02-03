import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import KanbanBoard from '../components/KanbanBoard';
import WorkItemModal from '../components/WorkItemModal';
import { FEATURE_COLUMNS } from '../utils/boardConfig';

const FeatureBoard: React.FC = () => {
  const { getWorkItemsByType, selectedWorkItem, setSelectedWorkItem } = useStore();
  const [showModal, setShowModal] = useState(false);
  const [modalColumnId, setModalColumnId] = useState<string | null>(null);

  const features = getWorkItemsByType('feature');

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
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ margin: 0, fontSize: '32px', fontWeight: '700', color: '#111827' }}>
          Feature Board
        </h1>
        <p style={{ margin: '8px 0 0 0', color: '#6b7280', fontSize: '14px' }}>
          Track value-added work for epics
        </p>
      </div>

      <KanbanBoard
        boardId="feature-board"
        columns={FEATURE_COLUMNS}
        workItems={features}
        onAddItem={handleAddItem}
        addItemColumnId="funnel"
      />

      {showModal && (
        <WorkItemModal
          itemId={selectedWorkItem}
          onClose={handleCloseModal}
          type="feature"
          defaultStatus={modalColumnId === 'funnel' ? 'funnel' : undefined}
        />
      )}
    </div>
  );
};

export default FeatureBoard;

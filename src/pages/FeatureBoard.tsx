import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import KanbanBoard from '../components/KanbanBoard';
import WorkItemModal from '../components/WorkItemModal';
import FeatureColumnsExplainedModal from '../components/FeatureColumnsExplainedModal';
import BoardPageHeader from '../components/BoardPageHeader';
import Button from '../components/Button';
import { useBoardWorkItemModal } from '../hooks/useBoardWorkItemModal';
import { FEATURE_COLUMNS } from '../utils/boardConfig';
import { spacing } from '../styles/theme';

const FeatureBoard: React.FC = () => {
  const { getWorkItemsByType, selectedWorkItem, getTypeLabel } = useStore();
  const { showModal, modalColumnId, handleAddItem, handleCloseModal } = useBoardWorkItemModal();
  const [showColumnsExplained, setShowColumnsExplained] = useState(false);
  const features = getWorkItemsByType('feature');
  const epicLabel = getTypeLabel('epic');
  const featureLabel = getTypeLabel('feature');

  return (
    <div style={{ padding: spacing.xxl }}>
      <BoardPageHeader title={`${featureLabel} Board`} subtitle={`Track value-added work for ${epicLabel.toLowerCase()}s`}>
        <Button variant="secondary" onClick={() => setShowColumnsExplained(true)}>
          Columns Explained
        </Button>
      </BoardPageHeader>

      <KanbanBoard
        boardId="feature-board"
        columns={FEATURE_COLUMNS}
        workItems={features}
        onAddItem={handleAddItem}
        addItemColumnId="funnel"
        addItemLabel={`Add a ${featureLabel}`}
      />

      {showModal && (
        <WorkItemModal
          itemId={selectedWorkItem}
          onClose={handleCloseModal}
          type="feature"
          allowedTypes={['feature']}
          defaultStatus={modalColumnId === 'funnel' ? 'funnel' : undefined}
        />
      )}
      {showColumnsExplained && (
        <FeatureColumnsExplainedModal onClose={() => setShowColumnsExplained(false)} />
      )}
    </div>
  );
};

export default FeatureBoard;

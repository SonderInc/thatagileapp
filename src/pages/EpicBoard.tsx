import React from 'react';
import { useStore } from '../store/useStore';
import KanbanBoard from '../components/KanbanBoard';
import WorkItemModal from '../components/WorkItemModal';
import BoardPageHeader from '../components/BoardPageHeader';
import { useBoardWorkItemModal } from '../hooks/useBoardWorkItemModal';
import { EPIC_COLUMNS } from '../utils/boardConfig';
import { Plus } from 'lucide-react';
import { colors, radius, spacing, typography } from '../styles/theme';

const EpicBoard: React.FC = () => {
  const { getWorkItemsByType, selectedWorkItem, getTypeLabel } = useStore();
  const { showModal, setShowModal, modalColumnId, setModalColumnId, handleAddItem, handleCloseModal } = useBoardWorkItemModal();
  const epics = getWorkItemsByType('epic');
  const epicLabel = getTypeLabel('epic');

  return (
    <div style={{ padding: spacing.xxl }}>
      <BoardPageHeader title={`${epicLabel} Board`} subtitle={`Manage ${epicLabel.toLowerCase()}s across the value stream`}>
        <button
          type="button"
          onClick={() => {
            setModalColumnId(null);
            setShowModal(true);
          }}
          style={{
            padding: `${spacing.md} ${spacing.xxl}`,
            backgroundColor: colors.primary,
            color: colors.background,
            border: 'none',
            borderRadius: radius.md,
            fontSize: typography.fontSizeBase,
            fontWeight: typography.fontWeightMedium,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: spacing.sm,
          }}
        >
          <Plus size={20} />
          New {epicLabel}
        </button>
      </BoardPageHeader>

      <KanbanBoard
        boardId="epic-board"
        columns={EPIC_COLUMNS}
        workItems={epics}
        onAddItem={handleAddItem}
        addItemColumnId="funnel"
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

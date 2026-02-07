import React, { useState, useEffect, useMemo } from 'react';
import Modal from '../Modal';
import { useStore } from '../../store/useStore';
import type { WorkItem } from '../../types';
import { spacing } from '../../styles/theme';

export interface AddFeatureFromBacklogModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: string;
  boardId: string;
  teamId: string;
  laneId: string;
  defaultColumnId?: string;
}

const AddFeatureFromBacklogModal: React.FC<AddFeatureFromBacklogModalProps> = ({
  isOpen,
  onClose,
  companyId,
  boardId,
  teamId,
  laneId,
  defaultColumnId = '1',
}) => {
  const {
    loadBacklogFeaturesForTeam,
    loadBoardItems,
    backlogFeaturesByTeam,
    boardItems,
    addFeatureToPlanningBoard,
    getProductIdForWorkItem,
    getHierarchyConfigForProduct,
  } = useStore();

  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const features = backlogFeaturesByTeam[teamId] ?? [];
  const columnId = defaultColumnId;

  useEffect(() => {
    if (!isOpen || !companyId || !boardId || !teamId) return;
    setSearch('');
    setError(null);
    loadBacklogFeaturesForTeam(companyId, teamId).catch((err) => {
      setError(err instanceof Error ? err.message : String(err));
    });
    loadBoardItems(boardId).catch(() => {});
  }, [isOpen, companyId, boardId, teamId, loadBacklogFeaturesForTeam, loadBoardItems]);

  const placedWorkItemIds = useMemo(
    () => new Set(boardItems.filter((i) => i.laneId === teamId).map((i) => i.workItemId)),
    [boardItems, teamId]
  );
  const availableFeatures = useMemo(() => {
    return features.filter((f) => {
      if (placedWorkItemIds.has(f.id)) return false;
      const productId = getProductIdForWorkItem(f.id);
      if (productId && !getHierarchyConfigForProduct(productId).enabledTypes.includes('feature')) return false;
      if (search.trim() !== '' && !(f.title ?? '').toLowerCase().includes(search.trim().toLowerCase())) return false;
      return true;
    });
  }, [features, placedWorkItemIds, search, getProductIdForWorkItem, getHierarchyConfigForProduct]);

  const handleSelect = async (feature: WorkItem) => {
    if (!laneId || adding) return;
    setError(null);
    setAdding(true);
    try {
      await addFeatureToPlanningBoard({
        boardId,
        companyId,
        workItemId: feature.id,
        laneId,
        columnId,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setAdding(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal title="Add feature from backlog" onClose={onClose} maxWidth="480px">
      {error && (
        <p
          style={{
            margin: '0 0 12px 0',
            padding: '10px 12px',
            backgroundColor: '#fef2f2',
            color: '#b91c1c',
            borderRadius: 6,
            fontSize: 14,
          }}
        >
          {error}
        </p>
      )}
      <div style={{ marginBottom: spacing.md }}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by title…"
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #d1d5db',
            borderRadius: 6,
            fontSize: 14,
          }}
        />
      </div>
      <div
        style={{
          maxHeight: 320,
          overflowY: 'auto',
          border: '1px solid #e5e7eb',
          borderRadius: 6,
        }}
      >
        {availableFeatures.length === 0 ? (
          <p style={{ margin: 16, color: '#6b7280', fontSize: 14 }}>
            {features.length === 0
              ? 'No features assigned to this team.'
              : placedWorkItemIds.size > 0 && search.trim() === ''
                ? 'All features for this team are already in this row.'
                : 'No matching features.'}
          </p>
        ) : (
          <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
            {availableFeatures.map((f) => (
              <li key={f.id}>
                <button
                  type="button"
                  onClick={() => handleSelect(f)}
                  disabled={adding}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '10px 12px',
                    textAlign: 'left',
                    border: 'none',
                    borderBottom: '1px solid #e5e7eb',
                    background: 'transparent',
                    cursor: adding ? 'not-allowed' : 'pointer',
                    fontSize: 14,
                    color: '#111827',
                  }}
                >
                  {f.title || 'Untitled feature'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
};

export default AddFeatureFromBacklogModal;

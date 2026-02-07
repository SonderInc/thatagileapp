import React, { useState, useEffect } from 'react';
import { getDataStore } from '../lib/adapters';
import { mergeProfileForBackfill } from '../lib/firestore';
import { useStore } from '../store/useStore';
import type { PlanningBoard as PlanningBoardType, PlanningBoardPlacement } from '../types';
import WorkItemModal from '../components/WorkItemModal';
import WorkItemCard from '../components/WorkItemCard';
import Modal from '../components/Modal';
import { ArrowLeft, Plus, X } from 'lucide-react';
import { spacing } from '../styles/theme';

const COLUMN_LABELS = ['Teams', 'Iteration 1', 'Iteration 2', 'Iteration 3', 'Iteration 4', 'Iteration 5'];
const LANE_LABEL_WIDTH = 180;
const COLUMN_MIN_WIDTH = 200;

const PlanningBoardPage: React.FC = () => {
  const {
    currentTenantId,
    currentUser,
    firebaseUser,
    teams,
    loadTeams,
    loadPlanningBoards,
    planningBoards,
    planningPlacements,
    selectedPlanningBoardId,
    setSelectedPlanningBoardId,
    loadPlanningPlacements,
    addPlanningBoard,
    addPlanningPlacement,
    deletePlanningPlacement,
    workItems,
    getWorkItemsByType,
    setSelectedWorkItem,
    setPlanningContext,
    selectedWorkItem,
    canEditPlanningBoard,
  } = useStore();

  const canEdit = canEditPlanningBoard();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createTeamIds, setCreateTeamIds] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [showFeaturePicker, setShowFeaturePicker] = useState<{ teamId: string; iterationColumn: 1 | 2 | 3 | 4 | 5 } | null>(null);
  const [showCardModal, setShowCardModal] = useState(false);
  const [addStoryContext, setAddStoryContext] = useState<{ parentId: string; defaultTeamId: string; defaultSprintId?: string } | null>(null);

  const board = selectedPlanningBoardId ? planningBoards.find((b) => b.id === selectedPlanningBoardId) : null;
  const features = getWorkItemsByType('feature');

  useEffect(() => {
    if (currentTenantId) {
      loadTeams(currentTenantId);
      loadPlanningBoards(currentTenantId).catch((err) =>
        console.error('[PlanningBoardPage] Load planning boards failed:', err?.message ?? err)
      );
    }
  }, [currentTenantId, loadTeams, loadPlanningBoards]);

  useEffect(() => {
    if (selectedPlanningBoardId) loadPlanningPlacements(selectedPlanningBoardId);
  }, [selectedPlanningBoardId, loadPlanningPlacements]);

  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTenantId || !createName.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      const newBoard: PlanningBoardType = {
        id: `planning-${Date.now()}`,
        name: createName.trim(),
        companyId: currentTenantId,
        teamIds: createTeamIds,
      };
      await addPlanningBoard(newBoard);
      setSelectedPlanningBoardId(newBoard.id);
      setShowCreateModal(false);
      setCreateName('');
      setCreateTeamIds([]);
      setCreateError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const isPermissionError = /permission|forbidden|denied/i.test(msg);
      if (isPermissionError && firebaseUser && currentTenantId && currentUser) {
        const rolesForMerge =
          (currentUser.roles?.length ? currentUser.roles : canEdit ? ['admin'] : []) ?? [];
        let syncSucceeded = false;
        try {
          const profile = await getDataStore().getUserProfile(firebaseUser.uid);
          if (profile) {
            const merged = mergeProfileForBackfill(profile, currentTenantId, rolesForMerge);
            await getDataStore().setUserProfile(merged);
            syncSucceeded = true;
          }
        } catch (syncErr) {
          console.warn('[PlanningBoardPage] Sync admin status failed:', syncErr);
        }
        setCreateError(
          syncSucceeded
            ? "We've synced your admin status. Please try again."
            : "We couldn't sync your admin status. Please refresh and try again."
        );
      } else {
        setCreateError(
          isPermissionError
            ? 'Could not save board. You may need admin or RTE access for this company.'
            : `Could not save board. ${msg}`
        );
      }
    } finally {
      setCreating(false);
    }
  };

  const toggleCreateTeam = (teamId: string) => {
    setCreateError(null);
    setCreateTeamIds((prev) =>
      prev.includes(teamId) ? prev.filter((id) => id !== teamId) : [...prev, teamId]
    );
  };

  const handleAddPlacement = (workItemId: string) => {
    if (!board || !showFeaturePicker) return;
    const placement: PlanningBoardPlacement = {
      id: `placement-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      boardId: board.id,
      workItemId,
      teamId: showFeaturePicker.teamId,
      iterationColumn: showFeaturePicker.iterationColumn,
    };
    addPlanningPlacement(placement);
    setShowFeaturePicker(null);
  };

  const getPlacementsForCell = (teamId: string, iterationColumn: 1 | 2 | 3 | 4 | 5) =>
    planningPlacements.filter((p) => p.boardId === board?.id && p.teamId === teamId && p.iterationColumn === iterationColumn);

  const handleCardClick = (workItemId: string, teamId: string) => {
    setSelectedWorkItem(workItemId);
    setPlanningContext({ teamId });
    setShowCardModal(true);
  };

  const handleCloseCardModal = () => {
    setShowCardModal(false);
    setSelectedWorkItem(null);
    setPlanningContext(null);
  };

  const handleAddUserStoryForTeam = (params: { featureId: string; teamId: string; sprintId?: string }) => {
    setShowCardModal(false);
    setSelectedWorkItem(null);
    setAddStoryContext({
      parentId: params.featureId,
      defaultTeamId: params.teamId,
      defaultSprintId: params.sprintId,
    });
  };

  const handleCloseAddStoryModal = () => {
    setAddStoryContext(null);
    setPlanningContext(null);
  };

  if (!currentTenantId) {
    return (
      <div style={{ padding: spacing.xxl }}>
        <p style={{ color: '#6b7280' }}>Select a company to use Planning Board.</p>
      </div>
    );
  }

  if (!selectedPlanningBoardId) {
    return (
      <div style={{ padding: spacing.xxl }}>
        <h1 style={{ margin: '0 0 8px 0', fontSize: '32px', fontWeight: 700, color: '#111827' }}>
          Planning Board
        </h1>
        <p style={{ margin: '0 0 24px 0', color: '#6b7280', fontSize: '14px' }}>
          Create a board with a name and teams (swimlanes). Then add features to iteration columns.
        </p>
        {canEdit && (
          <button
            type="button"
            onClick={() => {
              setCreateError(null);
              setShowCreateModal(true);
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 16px',
              backgroundColor: '#3b82f6',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Plus size={18} />
            Create board
          </button>
        )}
        <ul style={{ marginTop: '24px', padding: 0, listStyle: 'none' }}>
          {planningBoards.map((b) => (
            <li
              key={b.id}
              onClick={() => setSelectedPlanningBoardId(b.id)}
              style={{
                padding: '12px 16px',
                marginBottom: '8px',
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span style={{ fontWeight: 600, color: '#111827' }}>{b.name}</span>
              <span style={{ fontSize: '12px', color: '#6b7280' }}>{b.teamIds.length} teams</span>
            </li>
          ))}
        </ul>
        {showCreateModal && (
          <Modal
            title="Create Planning Board"
            onClose={() => {
              setCreateError(null);
              setShowCreateModal(false);
            }}
          >
            <form onSubmit={handleCreateBoard}>
              {createError && (
                <p
                  style={{
                    margin: '0 0 16px 0',
                    padding: '10px 12px',
                    backgroundColor: '#fef2f2',
                    color: '#b91c1c',
                    borderRadius: 6,
                    fontSize: 14,
                  }}
                >
                  {createError}
                </p>
              )}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, fontSize: 14 }}>Board name *</label>
                <input
                  type="text"
                  value={createName}
                  onChange={(e) => {
                    setCreateName(e.target.value);
                    setCreateError(null);
                  }}
                  placeholder="e.g. Q1 Planning"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: 14,
                  }}
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, fontSize: 14 }}>Teams (swimlanes)</label>
                <p style={{ margin: '0 0 8px 0', fontSize: 12, color: '#6b7280' }}>Select teams to add as rows on the board.</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {teams.map((t) => (
                    <label
                      key={t.id}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '6px 12px',
                        border: '1px solid #d1d5db',
                        borderRadius: 6,
                        cursor: 'pointer',
                        fontSize: 14,
                        backgroundColor: createTeamIds.includes(t.id) ? '#eff6ff' : '#fff',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={createTeamIds.includes(t.id)}
                        onChange={() => toggleCreateTeam(t.id)}
                      />
                      {t.name}
                    </label>
                  ))}
                  {teams.length === 0 && (
                    <span style={{ fontSize: 14, color: '#6b7280' }}>No teams yet. Create teams from Teams in the nav.</span>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{ padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: 6, background: '#fff', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !createName.trim()}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#3b82f6',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 6,
                    cursor: creating || !createName.trim() ? 'not-allowed' : 'pointer',
                  }}
                >
                  {creating ? 'Creating…' : 'Create'}
                </button>
              </div>
            </form>
          </Modal>
        )}
      </div>
    );
  }

  if (!board) {
    return (
      <div style={{ padding: spacing.xxl }}>
        <p style={{ color: '#6b7280' }}>Board not found.</p>
        <button type="button" onClick={() => setSelectedPlanningBoardId(null)} style={{ marginTop: 8 }}>
          Back to list
        </button>
      </div>
    );
  }

  const boardTeams = board.teamIds
    .map((tid) => teams.find((t) => t.id === tid))
    .filter((t): t is NonNullable<typeof t> => !!t);

  return (
    <div style={{ padding: spacing.xxl }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button
          type="button"
          onClick={() => setSelectedPlanningBoardId(null)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 12px',
            border: '1px solid #d1d5db',
            borderRadius: 6,
            background: '#fff',
            cursor: 'pointer',
            fontSize: 14,
          }}
        >
          <ArrowLeft size={18} />
          Back to list
        </button>
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#111827' }}>{board.name}</h1>
      </div>

      <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: 8, backgroundColor: '#fff' }}>
        <div style={{ display: 'flex', flexShrink: 0, borderBottom: '2px solid #e5e7eb' }}>
          {COLUMN_LABELS.map((label, idx) => (
            <div
              key={label}
              style={{
                minWidth: idx === 0 ? LANE_LABEL_WIDTH : COLUMN_MIN_WIDTH,
                width: idx === 0 ? LANE_LABEL_WIDTH : COLUMN_MIN_WIDTH,
                padding: '12px 8px',
                borderRight: idx === 0 ? '1px solid #e5e7eb' : '1px solid #e5e7eb',
                fontSize: 12,
                fontWeight: 600,
                color: '#6b7280',
                textTransform: idx === 0 ? 'uppercase' : 'none',
              }}
            >
              {label}
            </div>
          ))}
        </div>
        {boardTeams.map((team, rowIdx) => (
          <div
            key={team.id}
            style={{
              display: 'flex',
              alignItems: 'stretch',
              borderBottom: '1px solid #e5e7eb',
              minHeight: 100,
              backgroundColor: rowIdx % 2 === 0 ? '#fafafa' : '#fff',
            }}
          >
            <div
              style={{
                width: LANE_LABEL_WIDTH,
                minWidth: LANE_LABEL_WIDTH,
                padding: '8px',
                borderRight: '1px solid #e5e7eb',
                fontSize: 14,
                fontWeight: 600,
                color: '#111827',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {team.name}
            </div>
            {([1, 2, 3, 4, 5] as const).map((iter) => {
              const placements = getPlacementsForCell(team.id, iter);
              const isPickerOpen =
                showFeaturePicker?.teamId === team.id && showFeaturePicker?.iterationColumn === iter;
              return (
                <div
                  key={iter}
                  style={{
                    minWidth: COLUMN_MIN_WIDTH,
                    width: COLUMN_MIN_WIDTH,
                    padding: 8,
                    borderRight: '1px solid #e5e7eb',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                  }}
                >
                  {placements.map((p) => {
                    const feature = workItems.find((i) => i.id === p.workItemId && i.type === 'feature');
                    if (!feature) return null;
                    return (
                      <div key={p.id} style={{ position: 'relative' }}>
                        <div
                          onClick={() => handleCardClick(p.workItemId, team.id)}
                          style={{ cursor: 'pointer' }}
                        >
                          <WorkItemCard item={feature} compact />
                        </div>
                        {canEdit && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              deletePlanningPlacement(p.id);
                            }}
                            title="Remove from cell"
                            style={{
                              position: 'absolute',
                              top: 4,
                              right: 4,
                              width: 20,
                              height: 20,
                              padding: 0,
                              border: 'none',
                              borderRadius: 4,
                              background: '#fef2f2',
                              color: '#b91c1c',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 12,
                            }}
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                  {canEdit && (
                    <>
                      <button
                        type="button"
                        onClick={() => setShowFeaturePicker(isPickerOpen ? null : { teamId: team.id, iterationColumn: iter })}
                        style={{
                          padding: '6px',
                          border: '1px dashed #d1d5db',
                          borderRadius: 6,
                          background: 'transparent',
                          color: '#6b7280',
                          cursor: 'pointer',
                          fontSize: 12,
                          marginTop: 'auto',
                        }}
                      >
                        + Add feature
                      </button>
                      {isPickerOpen && (
                    <div
                      style={{
                        marginTop: 8,
                        padding: 8,
                        border: '1px solid #e5e7eb',
                        borderRadius: 6,
                        backgroundColor: '#fff',
                        maxHeight: 200,
                        overflowY: 'auto',
                      }}
                    >
                      {features.length === 0 ? (
                        <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>No features. Add features from Feature Board.</p>
                      ) : (
                        features.slice(0, 20).map((f) => (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => handleAddPlacement(f.id)}
                            style={{
                              display: 'block',
                              width: '100%',
                              padding: '6px 8px',
                              textAlign: 'left',
                              border: 'none',
                              borderRadius: 4,
                              background: 'transparent',
                              cursor: 'pointer',
                              fontSize: 13,
                            }}
                          >
                            {f.title}
                          </button>
                        ))
                      )}
                    </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {showCardModal && selectedWorkItem && (
        <WorkItemModal
          itemId={selectedWorkItem}
          onClose={handleCloseCardModal}
          type="feature"
          allowedTypes={['feature']}
          onAddUserStoryForTeam={handleAddUserStoryForTeam}
        />
      )}

      {addStoryContext && (
        <WorkItemModal
          itemId={null}
          onClose={handleCloseAddStoryModal}
          parentId={addStoryContext.parentId}
          type="user-story"
          allowedTypes={['user-story']}
          defaultTeamId={addStoryContext.defaultTeamId}
          defaultSprintId={addStoryContext.defaultSprintId}
        />
      )}

      {showFeaturePicker && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 998 }}
          aria-hidden
          onClick={() => setShowFeaturePicker(null)}
        />
      )}
    </div>
  );
};

export default PlanningBoardPage;

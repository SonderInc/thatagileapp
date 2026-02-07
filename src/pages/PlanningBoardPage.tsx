import React, { useState, useEffect, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { ensureDefaultPlanningBoard } from '../services/boards/ensureDefaultBoard';
import { ensureTenantAccess } from '../services/tenantMembershipService';
import { useStore } from '../store/useStore';
import type { PlanningBoard as PlanningBoardType } from '../types';
import WorkItemModal from '../components/WorkItemModal';
import WorkItemCard from '../components/WorkItemCard';
import Modal from '../components/Modal';
import AddFeatureFromBacklogModal from '../components/planning/AddFeatureFromBacklogModal';
import { ArrowLeft, Plus, X } from 'lucide-react';
import { spacing } from '../styles/theme';

const CELL_ID_SEP = '|';
function cellId(teamId: string, iter: number): string {
  return `${teamId}${CELL_ID_SEP}${iter}`;
}
function parseCellId(id: string): { laneId: string; columnId: string } | null {
  const idx = id.lastIndexOf(CELL_ID_SEP);
  if (idx === -1) return null;
  return { laneId: id.slice(0, idx), columnId: id.slice(idx + 1) };
}

const LANE_LABEL_WIDTH = 180;
const COLUMN_MIN_WIDTH = 200;

const PlanningBoardPage: React.FC = () => {
  const {
    currentTenantId,
    firebaseUser,
    teams,
    loadTeams,
    loadPlanningBoards,
    planningBoards,
    selectedPlanningBoardId,
    setSelectedPlanningBoardId,
    loadBoardItems,
    addPlanningBoard,
    updatePlanningBoard,
    boardItems,
    workItems,
    backlogFeatures,
    setSelectedWorkItem,
    setPlanningContext,
    selectedWorkItem,
    canEditPlanningBoard,
    moveBoardItem,
    removeFeatureFromPlanningBoard,
    label,
  } = useStore();

  const columnLabels = React.useMemo(
    () => [
      `${label('team')}s`,
      `${label('iteration')} 1`,
      `${label('iteration')} 2`,
      `${label('iteration')} 3`,
      `${label('iteration')} 4`,
      `${label('iteration')} 5`,
    ],
    [label]
  );

  const canEdit = canEditPlanningBoard();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createTeamIds, setCreateTeamIds] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [editingBoard, setEditingBoard] = useState<PlanningBoardType | null>(null);
  const [editName, setEditName] = useState('');
  const [editTeamIds, setEditTeamIds] = useState<string[]>([]);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [provisionError, setProvisionError] = useState<string | null>(null);
  const [showAddFeatureModal, setShowAddFeatureModal] = useState(false);
  const [addFeatureCell, setAddFeatureCell] = useState<{ teamId: string; laneId: string; columnId: string } | null>(null);
  const [showCardModal, setShowCardModal] = useState(false);
  const [addStoryContext, setAddStoryContext] = useState<{ parentId: string; defaultTeamId: string; defaultSprintId?: string } | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);

  const board = selectedPlanningBoardId ? planningBoards.find((b) => b.id === selectedPlanningBoardId) : null;

  const runProvisioning = useCallback(
    async (getCancelled?: () => boolean) => {
      if (!firebaseUser || !currentTenantId) return;
      setProvisionError(null);
      setIsProvisioning(true);
      try {
        await ensureTenantAccess(currentTenantId);
        if (getCancelled?.()) return;
        const defaultBoardId = await ensureDefaultPlanningBoard(currentTenantId, firebaseUser.uid);
        if (getCancelled?.()) return;
        setSelectedPlanningBoardId(defaultBoardId);
        await loadTeams(currentTenantId);
        if (getCancelled?.()) return;
        await loadPlanningBoards(currentTenantId);
      } catch (err: unknown) {
        if (getCancelled?.()) return;
        const code =
          err && typeof err === 'object' && 'code' in err
            ? String((err as { code: string }).code)
            : undefined;
        const rawMessage =
          err && typeof err === 'object' && 'message' in err
            ? String((err as { message: string }).message)
            : err instanceof Error
              ? err.message
              : 'Access not provisioned.';
        const message =
          code === 'PERMISSION_DENIED'
            ? 'Access not provisioned. You don\'t have access to this company.'
            : rawMessage === 'internal' || code === 'functions/internal'
              ? 'Access not provisioned. Please try again or contact support.'
              : rawMessage.startsWith('Access not provisioned')
                ? rawMessage
                : `Access not provisioned. ${rawMessage}`;
        setProvisionError(message);
      } finally {
        if (!getCancelled?.()) setIsProvisioning(false);
      }
    },
    [firebaseUser, currentTenantId, loadTeams, loadPlanningBoards, setSelectedPlanningBoardId]
  );

  useEffect(() => {
    if (!firebaseUser || !currentTenantId) return;
    let cancelled = false;
    runProvisioning(() => cancelled);
    return () => {
      cancelled = true;
    };
  }, [firebaseUser?.uid, currentTenantId, runProvisioning]);

  useEffect(() => {
    if (selectedPlanningBoardId) loadBoardItems(selectedPlanningBoardId);
  }, [selectedPlanningBoardId, loadBoardItems]);

  const handleCreateBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTenantId || !createName.trim()) return;
    setCreating(true);
    setCreateError(null);
    const newBoard: PlanningBoardType = {
      id: `planning-${Date.now()}`,
      name: createName.trim(),
      companyId: currentTenantId,
      teamIds: createTeamIds,
    };
    try {
      await addPlanningBoard(newBoard);
      setSelectedPlanningBoardId(newBoard.id);
      setShowCreateModal(false);
      setCreateName('');
      setCreateTeamIds([]);
      setCreateError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const isPermissionError = /permission|forbidden|denied/i.test(msg);
      if (isPermissionError && firebaseUser && currentTenantId) {
        let accessGranted = false;
        try {
          await ensureTenantAccess(currentTenantId, canEdit ? { role: 'admin' } : undefined);
          accessGranted = true;
          await addPlanningBoard(newBoard);
          setSelectedPlanningBoardId(newBoard.id);
          setShowCreateModal(false);
          setCreateName('');
          setCreateTeamIds([]);
          setCreateError(null);
        } catch (syncErr) {
          console.warn('[PlanningBoardPage] ensureTenantAccess or retry failed:', syncErr);
          setCreateError(
            accessGranted
              ? `You don't have permission to create boards for this company. You need admin or ${label('rte')} access.`
              : "You don't have access to this company."
          );
        }
      } else {
        setCreateError(
          isPermissionError
            ? `Could not save board. You may need admin or ${label('rte')} access for this company.`
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

  const openEditBoard = (board: PlanningBoardType) => {
    setEditingBoard(board);
    setEditName(board.name);
    setEditTeamIds([...board.teamIds]);
    setEditError(null);
  };

  const toggleEditTeam = (teamId: string) => {
    setEditError(null);
    setEditTeamIds((prev) =>
      prev.includes(teamId) ? prev.filter((id) => id !== teamId) : [...prev, teamId]
    );
  };

  const handleEditBoard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBoard || !editName.trim()) return;
    setEditSaving(true);
    setEditError(null);
    try {
      await updatePlanningBoard(editingBoard.id, { name: editName.trim(), teamIds: editTeamIds });
      setEditingBoard(null);
    } catch (err: unknown) {
      setEditError(err instanceof Error ? err.message : String(err));
    } finally {
      setEditSaving(false);
    }
  };

  const getBoardItemsForCell = (teamId: string, iterationColumn: 1 | 2 | 3 | 4 | 5) =>
    boardItems.filter((i) => i.laneId === teamId && i.columnId === String(iterationColumn));

  const handleDragEnd = useCallback(
    async (result: DropResult) => {
      if (!board || !result.destination) return;
      const { draggableId, source, destination } = result;
      if (source.droppableId === destination.droppableId) return;
      const parsed = parseCellId(destination.droppableId);
      if (!parsed) return;
      setMoveError(null);
      try {
        await moveBoardItem(board.id, draggableId, { laneId: parsed.laneId, columnId: parsed.columnId });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Could not move feature.';
        setMoveError(message);
      }
    },
    [board, moveBoardItem]
  );

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
        <p style={{ color: '#6b7280' }}>Select a company to use {label('planning_board')}.</p>
      </div>
    );
  }

  if (currentTenantId && !firebaseUser) {
    return (
      <div style={{ padding: spacing.xxl }}>
        <p style={{ color: '#6b7280' }}>Loading…</p>
      </div>
    );
  }

  if (!selectedPlanningBoardId) {
    return (
      <div style={{ padding: spacing.xxl }}>
        <h1 style={{ margin: '0 0 8px 0', fontSize: '32px', fontWeight: 700, color: '#111827' }}>
          {label('planning_board')}s
        </h1>
        <p style={{ margin: '0 0 24px 0', color: '#6b7280', fontSize: '14px' }}>
          Create a board with a name and {label('team')}s (swimlanes). Then add features to {label('iteration')} columns.
        </p>
        {isProvisioning && (
          <p style={{ margin: '0 0 16px 0', color: '#6b7280', fontSize: '14px' }}>
            Provisioning access…
          </p>
        )}
        {provisionError && (
          <div
            style={{
              margin: '0 0 16px 0',
              padding: '12px 16px',
              backgroundColor: '#fef2f2',
              color: '#b91c1c',
              borderRadius: '6px',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            <span style={{ flex: 1 }}>{provisionError}</span>
            <button
              type="button"
              onClick={() => runProvisioning()}
              style={{
                padding: '6px 12px',
                backgroundColor: '#b91c1c',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Retry
            </button>
          </div>
        )}
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
                gap: '12px',
              }}
            >
              <span style={{ flex: 1, fontWeight: 600, color: '#111827' }}>{b.name}</span>
              <span style={{ fontSize: '12px', color: '#6b7280' }}>{b.teamIds.length} teams</span>
              {canEdit && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openEditBoard(b);
                  }}
                  style={{
                    padding: '6px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    background: '#fff',
                    cursor: 'pointer',
                    fontSize: '13px',
                  }}
                >
                  Edit
                </button>
              )}
            </li>
          ))}
        </ul>
        {showCreateModal && (
          <Modal
            title={`Create ${label('planning_board')}`}
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
        {editingBoard && (
          <Modal
            title={`Edit ${label('planning_board')}`}
            onClose={() => {
              setEditError(null);
              setEditingBoard(null);
            }}
          >
            <form onSubmit={handleEditBoard}>
              {editError && (
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
                  {editError}
                </p>
              )}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, fontSize: 14 }}>Board name *</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => {
                    setEditName(e.target.value);
                    setEditError(null);
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
                        backgroundColor: editTeamIds.includes(t.id) ? '#eff6ff' : '#fff',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={editTeamIds.includes(t.id)}
                        onChange={() => toggleEditTeam(t.id)}
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
                  onClick={() => setEditingBoard(null)}
                  style={{ padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: 6, background: '#fff', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSaving || !editName.trim()}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#3b82f6',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 6,
                    cursor: editSaving || !editName.trim() ? 'not-allowed' : 'pointer',
                  }}
                >
                  {editSaving ? 'Saving…' : 'Save'}
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

      {moveError && (
        <div
          style={{
            marginBottom: 16,
            padding: '12px 16px',
            backgroundColor: '#fef2f2',
            color: '#b91c1c',
            borderRadius: 6,
            fontSize: 14,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <span style={{ flex: 1 }}>{moveError}</span>
          <button
            type="button"
            onClick={() => setMoveError(null)}
            style={{
              padding: '6px 12px',
              backgroundColor: '#b91c1c',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Dismiss
          </button>
        </div>
      )}

      <DragDropContext onDragEnd={handleDragEnd}>
        <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: 8, backgroundColor: '#fff' }}>
          <div style={{ display: 'flex', flexShrink: 0, borderBottom: '2px solid #e5e7eb' }}>
            {columnLabels.map((colLabel, idx) => (
              <div
                key={colLabel}
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
                {colLabel}
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
                const cellItems = getBoardItemsForCell(team.id, iter);
                return (
                  <Droppable key={cellId(team.id, iter)} droppableId={cellId(team.id, iter)}>
                    {(droppableProvided) => (
                      <div
                        ref={droppableProvided.innerRef}
                        {...droppableProvided.droppableProps}
                        style={{
                          minWidth: COLUMN_MIN_WIDTH,
                          width: COLUMN_MIN_WIDTH,
                          minHeight: 80,
                          padding: 8,
                          borderRight: '1px solid #e5e7eb',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 6,
                        }}
                      >
                        {cellItems.map((item, index) => {
                          const feature =
                            workItems.find((i) => i.id === item.workItemId && i.type === 'feature') ??
                            backlogFeatures.find((i) => i.id === item.workItemId);
                          if (!feature) return null;
                          return (
                            <Draggable
                              key={item.id}
                              draggableId={item.id}
                              index={index}
                              isDragDisabled={!canEdit}
                            >
                              {(draggableProvided) => (
                                <div
                                  ref={draggableProvided.innerRef}
                                  {...draggableProvided.draggableProps}
                                  {...draggableProvided.dragHandleProps}
                                  style={{
                                    ...draggableProvided.draggableProps.style,
                                    ...(draggableProvided.draggableProps.style?.position == null
                                      ? { position: 'relative' as const }
                                      : {}),
                                  }}
                                >
                                  <div
                                    onClick={() => handleCardClick(item.workItemId, team.id)}
                                    style={{ cursor: 'pointer' }}
                                  >
                                    <WorkItemCard item={feature} compact />
                                  </div>
                                  {canEdit && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        removeFeatureFromPlanningBoard(board!.id, item.id);
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
                              )}
                            </Draggable>
                          );
                        })}
                        {droppableProvided.placeholder}
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => {
                              setAddFeatureCell({ teamId: team.id, laneId: team.id, columnId: String(iter) });
                              setShowAddFeatureModal(true);
                            }}
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
                        )}
                      </div>
                    )}
                  </Droppable>
                );
              })}
            </div>
          ))}
        </div>
      </DragDropContext>

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

      {currentTenantId && board && addFeatureCell && (
        <AddFeatureFromBacklogModal
          isOpen={showAddFeatureModal}
          onClose={() => {
            setShowAddFeatureModal(false);
            setAddFeatureCell(null);
          }}
          companyId={currentTenantId}
          boardId={board.id}
          teamId={addFeatureCell.teamId}
          laneId={addFeatureCell.laneId}
          defaultColumnId={addFeatureCell.columnId}
        />
      )}
    </div>
  );
};

export default PlanningBoardPage;

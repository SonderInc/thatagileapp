import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { WorkItem, WorkItemType, WorkItemStatus, EpicFeatureSize, KanbanLane } from '../types';
import { useStore } from '../store/useStore';
import { getAllowedParentTypes, getAllowedChildTypes } from '../utils/hierarchy';
import { SIZE_OPTIONS, STORY_POINT_OPTIONS, DAYS_OPTIONS } from '../utils/estimates';
import { extractCursorInstruction } from '../lib/cursorInstruction';
import { Plus, FileText, BookOpen, Sparkles, ArrowLeft } from 'lucide-react';
import { useSequenceSuggestion } from '../hooks/useSequenceSuggestion';
import SuggestedOrderBox from './SuggestedOrderBox';
import Modal from './Modal';
import EpicHypothesisModal from './EpicHypothesisModal';
import EpicHypothesisExampleModal from './EpicHypothesisExampleModal';
import { useWorkItemForm } from '../hooks/useWorkItemForm';
import { compareWorkItemOrder } from '../utils/order';
import WsjfCalculator from './WsjfCalculator';

interface WorkItemModalProps {
  itemId: string | null;
  onClose: () => void;
  parentId?: string;
  type?: WorkItemType;
  /** When provided and not editing, restricts the type dropdown to these types (e.g. Team Board Backlog: user-story, task, bug). */
  allowedTypes?: WorkItemType[];
  /** When provided and not editing, use this as the initial status (e.g. Feature board Funnel column: funnel). */
  defaultStatus?: WorkItemStatus;
  /** When true, show Lane (swimlane) dropdown for task/bug (Kanban board). */
  showLaneField?: boolean;
  /** When provided and not editing a user story, pre-fill team/sprint (e.g. from Planning Board). */
  defaultTeamId?: string;
  defaultSprintId?: string;
  /** When editing a feature and user clicks "Add user story for [Team]", call this then close. Parent can open create-user-story modal. */
  onAddUserStoryForTeam?: (params: { featureId: string; teamId: string; sprintId?: string }) => void;
  /** When editing a feature and user clicks a child user story, call this so parent can switch modal to that item (e.g. setModalItemId). */
  onSelectWorkItem?: (workItemId: string) => void;
}

const KANBAN_LANE_OPTIONS: { value: KanbanLane; label: string }[] = [
  { value: 'expedite', label: 'Expedite' },
  { value: 'fixed-delivery-date', label: 'Fixed Delivery Date' },
  { value: 'standard', label: 'Standard' },
  { value: 'intangible', label: 'Intangible' },
];

function getDescendantIds(workItems: WorkItem[], rootId: string): Set<string> {
  const set = new Set<string>();
  let stack = workItems.filter((i) => i.parentId === rootId).map((i) => i.id);
  while (stack.length) {
    const id = stack.pop()!;
    set.add(id);
    stack = stack.concat(workItems.filter((i) => i.parentId === id).map((i) => i.id));
  }
  return set;
}

const WorkItemModal: React.FC<WorkItemModalProps> = ({ itemId, onClose, parentId, type, allowedTypes: allowedTypesProp, defaultStatus, showLaneField, defaultTeamId, defaultSprintId, onAddUserStoryForTeam, onSelectWorkItem }) => {
  const [createChildMode, setCreateChildMode] = useState<{ parentId: string; childType: WorkItemType } | null>(null);
  const handleClose = useCallback(() => {
    if (createChildMode) setCreateChildMode(null);
    else onClose();
  }, [createChildMode, onClose]);

  const effectiveItemId = createChildMode ? null : itemId;
  const effectiveParentId = createChildMode ? createChildMode.parentId : parentId;
  const effectiveType = createChildMode ? createChildMode.childType : type;

  const { users, teams, loadTeams, currentTenantId, workItems, getAggregatedStoryPoints, setSelectedWorkItem, getTypeLabel, deleteWorkItem, canResetBacklog, updateWorkItem, planningContext, setTerminologyProductId, setViewMode } = useStore();
  const {
    formData,
    setFormData,
    submitError,
    saving,
    item,
    isEditing,
    allowedTypes,
    handleSubmit,
    childTasksAndBugs,
    FEATURE_STATUSES,
  } = useWorkItemForm({ itemId: effectiveItemId, onClose: handleClose, parentId: effectiveParentId, type: effectiveType, allowedTypes: allowedTypesProp, defaultStatus, showLaneField, defaultTeamId, defaultSprintId });
  const [showEpicHypothesis, setShowEpicHypothesis] = useState(false);
  const [showEpicHypothesisExample, setShowEpicHypothesisExample] = useState(false);
  const [copiedHint, setCopiedHint] = useState<'cursor' | 'description' | null>(null);
  const [parentDropdownOpen, setParentDropdownOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [wsjfValid, setWsjfValid] = useState(true);
  const { loading: sequenceLoading, error: sequenceError, suggestion, requestSequence, applyOrder, clear: clearSuggestion } = useSequenceSuggestion();
  const [parentFilter, setParentFilter] = useState('');
  const [parentHighlightIndex, setParentHighlightIndex] = useState(0);
  const parentInputRef = useRef<HTMLInputElement>(null);

  const allowedParentTypes = useMemo(() => getAllowedParentTypes(formData.type!), [formData.type]);
  const descendantIds = useMemo(() => (item?.id ? getDescendantIds(workItems, item.id) : new Set<string>()), [item?.id, workItems]);
  const validParentOptions = useMemo(() => {
    return workItems
      .filter(
        (i) =>
          allowedParentTypes.includes(i.type) &&
          i.id !== item?.id &&
          !descendantIds.has(i.id)
      )
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [workItems, allowedParentTypes, item?.id, descendantIds]);
  const filteredParentOptions = useMemo(() => {
    if (!parentFilter.trim()) return validParentOptions;
    const q = parentFilter.trim().toLowerCase();
    return validParentOptions.filter((i) => i.title.toLowerCase().includes(q));
  }, [validParentOptions, parentFilter]);
  const selectedParent = formData.parentId ? workItems.find((i) => i.id === formData.parentId) : null;
  const childStoriesForFeature =
    item?.type === 'feature'
      ? workItems
          .filter((i) => i.parentId === item.id && i.type === 'user-story')
          .sort(compareWorkItemOrder)
      : [];

  useEffect(() => {
    if (
      currentTenantId &&
      (formData.type === 'feature' || formData.type === 'user-story' || item?.type === 'feature' || item?.type === 'user-story')
    )
      loadTeams(currentTenantId);
  }, [currentTenantId, formData.type, item?.type, loadTeams]);

  useEffect(() => {
    if (!parentDropdownOpen) setParentHighlightIndex(0);
  }, [parentDropdownOpen]);

  useEffect(() => {
    clearSuggestion();
  }, [itemId, clearSuggestion]);

  const onSuggestToast = useCallback(() => {
    setToastMessage('This is just a suggestion.');
    setTimeout(() => setToastMessage(null), 4000);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey && e.shiftKey && e.key === 'P') || (e.altKey && e.key === 'p')) {
        e.preventDefault();
        parentInputRef.current?.focus();
        setParentDropdownOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const desc = formData.description ?? '';
  const cursorBlock = extractCursorInstruction(desc);

  const copyToClipboard = useCallback(async (text: string, hint: 'cursor' | 'description') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedHint(hint);
      setTimeout(() => setCopiedHint(null), 2000);
    } catch {
      setCopiedHint(null);
    }
  }, []);

  const handleDelete = useCallback(() => {
    if (!item?.id || !canResetBacklog()) return;
    if (!window.confirm(`Delete "${item.title}"? This cannot be undone.`)) return;
    deleteWorkItem(item.id);
    onClose();
  }, [item?.id, item?.title, canResetBacklog, deleteWorkItem, onClose]);

  const parentItemForBack = createChildMode ? workItems.find((i) => i.id === createChildMode.parentId) : null;
  const showParentContent = isEditing && item && !createChildMode;
  const allowedChildTypes = showParentContent ? getAllowedChildTypes(item.type) : [];

  const currentProductId = useMemo(() => {
    const walkToProduct = (startId: string | undefined): string | null => {
      if (!startId) return null;
      let current: WorkItem | undefined = workItems.find((i) => i.id === startId);
      while (current) {
        if (current.type === 'product') return current.id;
        current = current.parentId ? workItems.find((i) => i.id === current!.parentId) : undefined;
      }
      return null;
    };
    if (item?.type === 'product') return item.id;
    if (effectiveParentId) return walkToProduct(effectiveParentId);
    if (item?.parentId) return walkToProduct(item.parentId);
    if (formData.parentId) return walkToProduct(formData.parentId);
    return null;
  }, [workItems, item?.type, item?.id, item?.parentId, effectiveParentId, formData.parentId]);

  const handleConfigureNomenclature = () => {
    if (currentProductId) {
      setTerminologyProductId(currentProductId);
      setViewMode('terminology');
      onClose();
    }
  };

  return (
    <Modal
      title={
        createChildMode
          ? `Create ${getTypeLabel(createChildMode.childType)}`
          : isEditing
            ? 'Edit Work Item'
            : 'Create Work Item'
      }
      onClose={handleClose}
      maxWidth="600px"
    >
      {createChildMode && parentItemForBack && (
        <button
          type="button"
          onClick={() => setCreateChildMode(null)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            marginBottom: '16px',
            padding: '6px 0',
            background: 'none',
            border: 'none',
            color: '#3b82f6',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
          }}
        >
          <ArrowLeft size={18} />
          Back to {parentItemForBack.title}
        </button>
      )}
      {currentProductId && (
        <button
          type="button"
          onClick={handleConfigureNomenclature}
          style={{
            display: 'block',
            marginBottom: '16px',
            padding: '4px 0',
            background: 'none',
            border: 'none',
            color: '#6b7280',
            fontSize: '13px',
            cursor: 'pointer',
            textDecoration: 'underline',
          }}
        >
          Configure nomenclature for this product
        </button>
      )}
      {submitError && (
          <div
            style={{
              marginBottom: '16px',
              padding: '12px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              color: '#b91c1c',
              fontSize: '14px',
            }}
          >
            {submitError}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>
              Unique ID
            </label>
            <input
              type="text"
              value={isEditing && item ? item.id : ''}
              placeholder="Assigned on save"
              readOnly
              disabled
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                fontSize: '14px',
                fontFamily: 'monospace',
                backgroundColor: '#f9fafb',
                color: '#6b7280',
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>
              Type
            </label>
            <select
              value={allowedTypes.includes(formData.type!) ? formData.type : allowedTypes[0]}
              onChange={(e) => {
                const newType = e.target.value as WorkItemType;
                const newAllowedParents = getAllowedParentTypes(newType);
                const currentParent = formData.parentId ? workItems.find((i) => i.id === formData.parentId) : null;
                const keepParent = currentParent && newAllowedParents.includes(currentParent.type);
                setFormData({ ...formData, type: newType, parentId: keepParent ? formData.parentId : undefined });
              }}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
              }}
              disabled={isEditing}
            >
              {allowedTypes.includes('product') && <option value="product">Product</option>}
              {allowedTypes.includes('epic') && <option value="epic">Epic</option>}
              {allowedTypes.includes('feature') && <option value="feature">Feature</option>}
              {allowedTypes.includes('user-story') && <option value="user-story">User Story</option>}
              {allowedTypes.includes('task') && <option value="task">Task</option>}
              {allowedTypes.includes('bug') && <option value="bug">Bug</option>}
            </select>
          </div>

          {formData.type === 'epic' && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setShowEpicHypothesis(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 14px',
                    border: '1px solid #3b82f6',
                    borderRadius: '6px',
                    backgroundColor: '#eff6ff',
                    color: '#1d4ed8',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                  }}
                >
                  <FileText size={18} />
                  Epic Hypothesis Statement
                </button>
                <button
                  type="button"
                  onClick={() => setShowEpicHypothesisExample(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 14px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    backgroundColor: '#ffffff',
                    color: '#374151',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                  }}
                >
                  <BookOpen size={18} />
                  Hypothesis Example
                </button>
              </div>
              <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: '#6b7280' }}>
                {isEditing
                  ? 'Use the hypothesis form to update Epic name, description, and owner.'
                  : 'Fill the hypothesis form to pre-fill Epic name, description, and owner.'}
              </p>
            </div>
          )}

          {allowedParentTypes.length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>
                Parent
              </label>
              <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#6b7280' }}>
                Ctrl+Shift+P or Alt+P to focus
              </p>
              <div style={{ position: 'relative' }}>
                <input
                  ref={parentInputRef}
                  type="text"
                  readOnly
                  value={parentDropdownOpen ? '' : (selectedParent ? `${getTypeLabel(selectedParent.type)}: ${selectedParent.title}` : 'None')}
                  placeholder="Select parent"
                  onFocus={() => setParentDropdownOpen(true)}
                  onClick={() => setParentDropdownOpen(true)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    backgroundColor: '#fff',
                    cursor: 'pointer',
                  }}
                />
                {parentDropdownOpen && (
                  <div
                    role="listbox"
                    aria-expanded={parentDropdownOpen}
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      marginTop: '4px',
                      backgroundColor: '#fff',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      maxHeight: '280px',
                      overflow: 'hidden',
                      display: 'flex',
                      flexDirection: 'column',
                      zIndex: 1000,
                    }}
                  >
                    <input
                      type="text"
                      value={parentFilter}
                      onChange={(e) => {
                        setParentFilter(e.target.value);
                        setParentHighlightIndex(0);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'ArrowDown') {
                          e.preventDefault();
                          setParentHighlightIndex((i) => Math.min(i + 1, (parentFilter.trim() ? filteredParentOptions : validParentOptions).length));
                        } else if (e.key === 'ArrowUp') {
                          e.preventDefault();
                          setParentHighlightIndex((i) => Math.max(i - 1, 0));
                        } else if (e.key === 'Enter') {
                          e.preventDefault();
                          const opts = parentFilter.trim() ? filteredParentOptions : validParentOptions;
                          const withNone = [{ id: '', title: 'None' } as WorkItem & { id: string }].concat(opts);
                          const chosen = withNone[parentHighlightIndex];
                          if (chosen) {
                            setFormData({ ...formData, parentId: chosen.id || undefined });
                            setParentDropdownOpen(false);
                            setParentFilter('');
                          }
                        } else if (e.key === 'Escape') {
                          setParentDropdownOpen(false);
                          setParentFilter('');
                        }
                      }}
                      placeholder="Type to search..."
                      autoFocus
                      style={{
                        padding: '8px 12px',
                        border: 'none',
                        borderBottom: '1px solid #e5e7eb',
                        borderRadius: '6px 6px 0 0',
                        fontSize: '14px',
                        outline: 'none',
                      }}
                    />
                    <div style={{ overflowY: 'auto', maxHeight: '220px' }}>
                      <div
                        role="option"
                        aria-selected={!formData.parentId}
                        style={{
                          padding: '8px 12px',
                          cursor: 'pointer',
                          backgroundColor: parentHighlightIndex === 0 ? '#eff6ff' : 'transparent',
                          fontSize: '14px',
                          color: '#6b7280',
                        }}
                        onClick={() => {
                          setFormData({ ...formData, parentId: undefined });
                          setParentDropdownOpen(false);
                          setParentFilter('');
                        }}
                        onMouseEnter={() => setParentHighlightIndex(0)}
                      >
                        None
                      </div>
                      {(parentFilter.trim() ? filteredParentOptions : validParentOptions).map((p, idx) => (
                        <div
                          key={p.id}
                          role="option"
                          aria-selected={formData.parentId === p.id}
                          style={{
                            padding: '8px 12px',
                            cursor: 'pointer',
                            backgroundColor: parentHighlightIndex === idx + 1 ? '#eff6ff' : 'transparent',
                            fontSize: '14px',
                          }}
                          onClick={() => {
                            setFormData({ ...formData, parentId: p.id });
                            setParentDropdownOpen(false);
                            setParentFilter('');
                          }}
                          onMouseEnter={() => setParentHighlightIndex(idx + 1)}
                        >
                          {getTypeLabel(p.type)}: {p.title}
                        </div>
                      ))}
                      {validParentOptions.length === 0 && (
                        <div style={{ padding: '12px', fontSize: '14px', color: '#6b7280' }}>
                          Create a {allowedParentTypes.map((t) => getTypeLabel(t)).join(' or ')} first.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              {parentDropdownOpen && (
                <div
                  style={{ position: 'fixed', inset: 0, zIndex: 999 }}
                  aria-hidden
                  onClick={() => {
                    setParentDropdownOpen(false);
                    setParentFilter('');
                  }}
                />
              )}
            </div>
          )}

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>
              Name *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>
              Description
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', marginBottom: '6px' }}>
              {cursorBlock && (
                <button
                  type="button"
                  onClick={() => copyToClipboard(cursorBlock, 'cursor')}
                  style={{ padding: '6px 12px', fontSize: '13px', border: '1px solid #d1d5db', borderRadius: '6px', background: '#fff', cursor: 'pointer' }}
                >
                  {copiedHint === 'cursor' ? 'Copied!' : 'Copy Cursor Instruction'}
                </button>
              )}
              {desc && (
                <button
                  type="button"
                  onClick={() => copyToClipboard(desc, 'description')}
                  style={{ padding: '6px 12px', fontSize: '13px', border: '1px solid #d1d5db', borderRadius: '6px', background: '#fff', cursor: 'pointer' }}
                >
                  {copiedHint === 'description' ? 'Copied!' : 'Copy Description'}
                </button>
              )}
            </div>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                fontFamily: 'inherit',
              }}
            />
          </div>

          {formData.type === 'user-story' && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>
                Acceptance criteria
              </label>
              <textarea
                value={formData.acceptanceCriteria || ''}
                onChange={(e) => setFormData({ ...formData, acceptanceCriteria: e.target.value })}
                rows={4}
                placeholder="e.g. Given… When… Then… or bullet list"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                }}
              />
            </div>
          )}

          {isEditing && formData.type === 'user-story' && (
            <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                id="user-story-accepted"
                checked={formData.status === 'done'}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    status: e.target.checked ? 'done' : 'to-do',
                  })
                }
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              <label htmlFor="user-story-accepted" style={{ fontWeight: '500', fontSize: '14px', cursor: 'pointer' }}>
                Accepted
              </label>
              <span style={{ fontSize: '12px', color: '#6b7280' }}>
                (moves story to Done)
              </span>
            </div>
          )}

          {formData.type !== 'product' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>
                  Status
                </label>
                <select
                  value={
                    formData.type === 'user-story' && !['backlog', 'to-do', 'in-progress', 'done', 'archive'].includes(formData.status ?? '')
                      ? 'backlog'
                      : (formData.type === 'task' || formData.type === 'bug') && !['to-do', 'in-progress', 'done'].includes(formData.status ?? '')
                        ? 'to-do'
                        : formData.type === 'feature' && !FEATURE_STATUSES.includes((formData.status ?? '') as WorkItemStatus)
                          ? 'funnel'
                          : formData.status
                  }
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as WorkItemStatus })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                  }}
                >
                  {formData.type === 'user-story' ? (
                    <>
                      <option value="backlog">Backlog</option>
                      <option value="to-do">Ready</option>
                      <option value="in-progress">In Progress</option>
                      <option value="done">Done</option>
                      <option value="archive">Archive</option>
                    </>
                  ) : (formData.type === 'task' || formData.type === 'bug') ? (
                    <>
                      <option value="to-do">Ready</option>
                      <option value="in-progress">In progress</option>
                      <option value="done">Done</option>
                    </>
                  ) : formData.type === 'feature' ? (
                    <>
                      <option value="funnel">Funnel</option>
                      <option value="analysis">Analyzing</option>
                      <option value="program-backlog">Program Backlog</option>
                      <option value="implementation">Implementing</option>
                      <option value="validating">Validating</option>
                      <option value="deploying">Deploying</option>
                      <option value="releasing">Releasing</option>
                    </>
                  ) : (
                    <>
                      <option value="funnel">Funnel</option>
                      <option value="backlog">Backlog</option>
                      <option value="analysis">Analysis</option>
                      <option value="prioritization">Prioritization</option>
                      <option value="implementation">Implementation</option>
                      <option value="intake">Intake</option>
                      <option value="define">Define</option>
                      <option value="design">Design</option>
                      <option value="develop">Develop</option>
                      <option value="release">Release</option>
                      <option value="to-do">To Do</option>
                      <option value="in-progress">In Progress</option>
                      <option value="done">Done</option>
                      <option value="archive">Archive</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>
                  Priority
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as WorkItem['priority'] })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                  }}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>
          )}

          {showLaneField && (formData.type === 'task' || formData.type === 'bug') && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>
                Lane
              </label>
              <select
                value={formData.lane ?? 'standard'}
                onChange={(e) => setFormData({ ...formData, lane: e.target.value as KanbanLane })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
              >
                {KANBAN_LANE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>
                Assignee
              </label>
              <select
                value={formData.assignee || ''}
                onChange={(e) => setFormData({ ...formData, assignee: e.target.value || undefined })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
              >
                <option value="">Unassigned</option>
                {users.map((user) => (
                  <option key={user.id} value={user.name}>
                    {user.name}
                  </option>
                ))}
              </select>
            </div>

            {(formData.type === 'epic' || formData.type === 'feature') && (
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>
                  Size
                </label>
                <select
                  value={formData.size ?? '?'}
                  onChange={(e) => setFormData({ ...formData, size: e.target.value as EpicFeatureSize })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                  }}
                >
                  {SIZE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            )}

            {formData.type === 'feature' && (
              <>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>
                    Teams on this feature
                  </label>
                  <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#6b7280' }}>
                    Add teams to show this feature as a swimlane on their board.
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                    {teams.length === 0 ? (
                      <span style={{ fontSize: '14px', color: '#6b7280' }}>No teams yet. Create teams from Teams in the nav.</span>
                    ) : (
                      teams.map((team) => (
                        <label
                          key={team.id}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '14px' }}
                        >
                          <input
                            type="checkbox"
                            checked={(formData.teamIds ?? []).includes(team.id)}
                            onChange={() => {
                              const current = formData.teamIds ?? [];
                              const next = current.includes(team.id)
                                ? current.filter((id) => id !== team.id)
                                : [...current, team.id];
                              setFormData({ ...formData, teamIds: next });
                            }}
                          />
                          {team.name}
                        </label>
                      ))
                    )}
                  </div>
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>
                    Story Points (from User Stories)
                  </label>
                  <input
                    type="text"
                    value={isEditing && item ? getAggregatedStoryPoints(item.id) : 0}
                    readOnly
                    disabled
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '6px',
                      fontSize: '14px',
                      backgroundColor: '#f9fafb',
                      color: '#6b7280',
                    }}
                  />
                </div>
              </>
            )}

            {formData.type === 'user-story' && (
              <>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>
                    Team
                  </label>
                  <select
                    value={formData.teamId ?? ''}
                    onChange={(e) => setFormData({ ...formData, teamId: e.target.value || undefined })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                    }}
                  >
                    <option value="">No team</option>
                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>
                    Story Points
                  </label>
                  <select
                    value={formData.storyPoints == null ? '?' : String(formData.storyPoints)}
                    onChange={(e) => {
                      const v = e.target.value;
                      setFormData({ ...formData, storyPoints: v === '?' ? null : parseInt(v, 10) });
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                    }}
                  >
                    {STORY_POINT_OPTIONS.map((opt) => (
                      <option key={opt.label} value={opt.value === null ? '?' : opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {(formData.type === 'task' || formData.type === 'bug') && (
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>
                  Days
                </label>
                <select
                  value={formData.estimatedDays === undefined || formData.estimatedDays === null ? '?' : String(formData.estimatedDays)}
                  onChange={(e) => {
                    const v = e.target.value;
                    setFormData({ ...formData, estimatedDays: v === '?' ? null : parseFloat(v) });
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                  }}
                >
                  {DAYS_OPTIONS.map((opt) => (
                    <option key={opt.label} value={opt.value === null ? '?' : opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {formData.type === 'feature' && (
            <WsjfCalculator
              value={{
                wsjfBusinessValue: formData.wsjfBusinessValue,
                wsjfTimeCriticality: formData.wsjfTimeCriticality,
                wsjfRiskReduction: formData.wsjfRiskReduction,
                wsjfJobSize: formData.wsjfJobSize,
              }}
              onChange={(next) =>
                setFormData({
                  ...formData,
                  wsjfBusinessValue: next.wsjfBusinessValue,
                  wsjfTimeCriticality: next.wsjfTimeCriticality,
                  wsjfRiskReduction: next.wsjfRiskReduction,
                  wsjfJobSize: next.wsjfJobSize,
                })
              }
              readOnly={false}
              onValidityChange={setWsjfValid}
            />
          )}

          {showParentContent && item?.type === 'epic' && allowedChildTypes.length > 0 && (
            <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>Features</span>
                {allowedChildTypes.map((childType) => (
                  <button
                    key={childType}
                    type="button"
                    onClick={() => setCreateChildMode({ parentId: item.id, childType })}
                    style={{
                      padding: '6px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      backgroundColor: '#ffffff',
                      color: '#374151',
                      cursor: 'pointer',
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Plus size={14} />
                    Add {getTypeLabel(childType)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {showParentContent && item?.type === 'user-story' && (
            <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>Tasks & bugs</span>
                {childTasksAndBugs.length >= 2 && (
                  <button
                    type="button"
                    disabled={sequenceLoading}
                    onClick={() =>
                      requestSequence(
                        {
                          storyDescription: formData.description ?? item?.description ?? '',
                          tasks: childTasksAndBugs.map((t) => ({ id: t.id, title: t.title, description: t.description })),
                        },
                        'tasks',
                        { onSuggestToast }
                      )
                    }
                    style={{
                      padding: '6px 12px',
                      border: '1px solid #a78bfa',
                      borderRadius: '6px',
                      backgroundColor: '#f5f3ff',
                      color: '#6d28d9',
                      cursor: sequenceLoading ? 'wait' : 'pointer',
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Sparkles size={14} />
                    {sequenceLoading ? 'Suggesting…' : 'Suggest sequence'}
                  </button>
                )}
                {allowedChildTypes.map((childType) => (
                  <button
                    key={childType}
                    type="button"
                    onClick={() => setCreateChildMode({ parentId: item.id, childType })}
                    style={{
                      padding: '6px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      backgroundColor: '#ffffff',
                      color: '#374151',
                      cursor: 'pointer',
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Plus size={14} />
                    Add {getTypeLabel(childType)}
                  </button>
                ))}
              </div>
              {sequenceError && (
                <div style={{ marginBottom: '8px', padding: '8px 12px', backgroundColor: '#fef2f2', borderRadius: '6px', fontSize: '13px', color: '#b91c1c' }}>
                  {sequenceError.includes('not configured') ? 'Configure API to enable.' : sequenceError}
                </div>
              )}
              {suggestion?.context === 'tasks' && (
                <SuggestedOrderBox
                  orderedIds={suggestion.ids}
                  items={childTasksAndBugs.map((t) => ({ id: t.id, title: t.title }))}
                  onApply={async () => {
                    await applyOrder({ orderedIds: suggestion.ids, updateWorkItem });
                    clearSuggestion();
                  }}
                />
              )}
              {childTasksAndBugs.length > 0 && (
                <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                  {childTasksAndBugs.map((child) => (
                    <li
                      key={child.id}
                      onClick={() => setSelectedWorkItem(child.id)}
                      style={{
                        padding: '8px 12px',
                        marginBottom: '4px',
                        backgroundColor: '#f9fafb',
                        borderRadius: '6px',
                        border: '1px solid #e5e7eb',
                        cursor: 'pointer',
                        fontSize: '13px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <span style={{ fontWeight: '500', color: '#111827' }}>{child.title}</span>
                      <span style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', fontWeight: '600' }}>
                        {getTypeLabel(child.type)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {showParentContent && item?.type === 'feature' && (
            <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>User stories</span>
                {allowedChildTypes.map((childType) => (
                  <button
                    key={childType}
                    type="button"
                    onClick={() => setCreateChildMode({ parentId: item.id, childType })}
                    style={{
                      padding: '6px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      backgroundColor: '#ffffff',
                      color: '#374151',
                      cursor: 'pointer',
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Plus size={14} />
                    Add {getTypeLabel(childType)}
                  </button>
                ))}
                {planningContext && item && onAddUserStoryForTeam && (
                  <button
                    type="button"
                    onClick={() => {
                      onAddUserStoryForTeam({
                        featureId: item.id,
                        teamId: planningContext.teamId,
                        sprintId: planningContext.sprintId,
                      });
                      onClose();
                    }}
                    style={{
                      padding: '6px 12px',
                      border: '1px solid #3b82f6',
                      borderRadius: '6px',
                      backgroundColor: '#eff6ff',
                      color: '#1d4ed8',
                      cursor: 'pointer',
                      fontSize: '13px',
                    }}
                  >
                    Add user story for {teams.find((t) => t.id === planningContext.teamId)?.name ?? 'team'}
                  </button>
                )}
                {childStoriesForFeature.length >= 2 && (
                  <button
                    type="button"
                    disabled={sequenceLoading}
                    onClick={() =>
                      requestSequence(
                        {
                          featureDescription: formData.description ?? item?.description ?? '',
                          stories: childStoriesForFeature.map((s) => ({ id: s.id, title: s.title, description: s.description })),
                        },
                        'stories',
                        { onSuggestToast }
                      )
                    }
                    style={{
                      padding: '6px 12px',
                      border: '1px solid #a78bfa',
                      borderRadius: '6px',
                      backgroundColor: '#f5f3ff',
                      color: '#6d28d9',
                      cursor: sequenceLoading ? 'wait' : 'pointer',
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Sparkles size={14} />
                    {sequenceLoading ? 'Suggesting…' : 'Suggest sequence'}
                  </button>
                )}
              </div>
              {sequenceError && (
                <div style={{ marginBottom: '8px', padding: '8px 12px', backgroundColor: '#fef2f2', borderRadius: '6px', fontSize: '13px', color: '#b91c1c' }}>
                  {sequenceError.includes('not configured') ? 'Configure API to enable.' : sequenceError}
                </div>
              )}
              {suggestion?.context === 'stories' && (
                <SuggestedOrderBox
                  orderedIds={suggestion.ids}
                  items={childStoriesForFeature.map((s) => ({ id: s.id, title: s.title }))}
                  onApply={async () => {
                    await applyOrder({ orderedIds: suggestion.ids, updateWorkItem });
                    clearSuggestion();
                  }}
                />
              )}
              {childStoriesForFeature.length > 0 && (
                <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                  {childStoriesForFeature.map((child) => (
                    <li
                      key={child.id}
                      onClick={() => (onSelectWorkItem ? onSelectWorkItem(child.id) : setSelectedWorkItem(child.id))}
                      style={{
                        padding: '8px 12px',
                        marginBottom: '4px',
                        backgroundColor: '#f9fafb',
                        borderRadius: '6px',
                        border: '1px solid #e5e7eb',
                        cursor: 'pointer',
                        fontSize: '13px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <span style={{ fontWeight: '500', color: '#111827' }}>{child.title}</span>
                      <span style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', fontWeight: '600' }}>
                        {getTypeLabel(child.type)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '12px' }}>
              {showParentContent && item && canResetBacklog() && (
                <button
                  type="button"
                  onClick={handleDelete}
                  style={{
                    padding: '10px 20px',
                    border: '1px solid #dc2626',
                    borderRadius: '6px',
                    backgroundColor: '#ffffff',
                    color: '#dc2626',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                  }}
                >
                  Delete
                </button>
              )}
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '10px 20px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  backgroundColor: '#ffffff',
                  color: '#374151',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || (formData.type === 'feature' && !wsjfValid)}
                style={{
                  padding: '10px 20px',
                  border: 'none',
                  borderRadius: '6px',
                  backgroundColor: saving ? '#9ca3af' : '#3b82f6',
                  color: '#ffffff',
                  cursor: saving ? 'wait' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                }}
              >
                {saving ? 'Saving…' : isEditing ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </form>

      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '10px 20px',
            backgroundColor: '#1f2937',
            color: '#fff',
            borderRadius: '8px',
            fontSize: '14px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 10000,
          }}
        >
          {toastMessage}
        </div>
      )}

      {showEpicHypothesis && (
        <EpicHypothesisModal
          onClose={() => setShowEpicHypothesis(false)}
          onApply={({ title, description, assignee }) => {
            setFormData((prev) => ({
              ...prev,
              title,
              description,
              assignee: assignee ?? prev.assignee,
              status: 'funnel',
            }));
            setShowEpicHypothesis(false);
          }}
          initialNotes={formData.description ?? item?.description ?? undefined}
        />
      )}
      {showEpicHypothesisExample && (
        <EpicHypothesisExampleModal onClose={() => setShowEpicHypothesisExample(false)} />
      )}
    </Modal>
  );
};

export default WorkItemModal;

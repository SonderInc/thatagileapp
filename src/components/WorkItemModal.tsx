import React, { useState, useCallback } from 'react';
import { WorkItem, WorkItemType, WorkItemStatus, EpicFeatureSize } from '../types';
import { useStore } from '../store/useStore';
import { SIZE_OPTIONS, STORY_POINT_OPTIONS, DAYS_OPTIONS } from '../utils/estimates';
import { extractCursorInstruction } from '../lib/cursorInstruction';
import { Plus, FileText, BookOpen } from 'lucide-react';
import Modal from './Modal';
import EpicHypothesisModal from './EpicHypothesisModal';
import EpicHypothesisExampleModal from './EpicHypothesisExampleModal';
import { useWorkItemForm } from '../hooks/useWorkItemForm';

interface WorkItemModalProps {
  itemId: string | null;
  onClose: () => void;
  parentId?: string;
  type?: WorkItemType;
  /** When provided and not editing, restricts the type dropdown to these types (e.g. Team Board Backlog: user-story, task, bug). */
  allowedTypes?: WorkItemType[];
  /** When provided and not editing, use this as the initial status (e.g. Feature board Funnel column: funnel). */
  defaultStatus?: WorkItemStatus;
}

const WorkItemModal: React.FC<WorkItemModalProps> = ({ itemId, onClose, parentId, type, allowedTypes: allowedTypesProp, defaultStatus }) => {
  const { users, getAggregatedStoryPoints, getFeaturesInDevelopState, setSelectedWorkItem, getTypeLabel, deleteWorkItem, canResetBacklog } = useStore();
  const {
    formData,
    setFormData,
    submitError,
    saving,
    item,
    isEditing,
    allowedTypes,
    handleSubmit,
    handleAddTask,
    handleAddBug,
    childTasksAndBugs,
    FEATURE_STATUSES,
  } = useWorkItemForm({ itemId, onClose, parentId, type, allowedTypes: allowedTypesProp, defaultStatus });
  const [showEpicHypothesis, setShowEpicHypothesis] = useState(false);
  const [showEpicHypothesisExample, setShowEpicHypothesisExample] = useState(false);
  const [copiedHint, setCopiedHint] = useState<'cursor' | 'description' | null>(null);

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

  return (
    <Modal
      title={isEditing ? 'Edit Work Item' : 'Create Work Item'}
      onClose={onClose}
      maxWidth="600px"
    >
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
              onChange={(e) => setFormData({ ...formData, type: e.target.value as WorkItemType })}
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

          {!isEditing && formData.type === 'user-story' && (
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', fontSize: '14px' }}>
                Parent feature
              </label>
              <select
                value={formData.parentId ?? ''}
                onChange={(e) => setFormData({ ...formData, parentId: e.target.value || undefined })}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
              >
                <option value="">None (Ad hoc)</option>
                {getFeaturesInDevelopState().map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.title}
                  </option>
                ))}
              </select>
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
            )}

            {formData.type === 'user-story' && (
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

          {isEditing && item?.type === 'user-story' && (
            <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <span style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>Tasks & bugs</span>
                <button
                  type="button"
                  onClick={handleAddTask}
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
                  Add task
                </button>
                <button
                  type="button"
                  onClick={handleAddBug}
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
                  Add bug
                </button>
              </div>
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

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'space-between', alignItems: 'center', marginTop: '24px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '12px' }}>
              {isEditing && item && canResetBacklog() && (
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
                disabled={saving}
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
        />
      )}
      {showEpicHypothesisExample && (
        <EpicHypothesisExampleModal onClose={() => setShowEpicHypothesisExample(false)} />
      )}
    </Modal>
  );
};

export default WorkItemModal;

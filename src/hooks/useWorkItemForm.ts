import { useState, useEffect, useMemo } from 'react';
import { WorkItem, WorkItemType, WorkItemStatus } from '../types';
import { useStore } from '../store/useStore';
import { getAllowedChildTypes } from '../utils/hierarchy';

const FEATURE_STATUSES: WorkItemStatus[] = ['funnel', 'analysis', 'program-backlog', 'implementation', 'validating', 'deploying', 'releasing'];

export interface UseWorkItemFormProps {
  itemId: string | null;
  onClose: () => void;
  parentId?: string;
  type?: WorkItemType;
  allowedTypes?: WorkItemType[];
  defaultStatus?: WorkItemStatus;
}

export function useWorkItemForm({
  itemId,
  onClose,
  parentId,
  type,
  allowedTypes: allowedTypesProp,
  defaultStatus,
}: UseWorkItemFormProps) {
  const { workItems, addWorkItem, updateWorkItem, getWorkItemsByParent } = useStore();
  const [formData, setFormData] = useState<Partial<WorkItem>>({
    title: '',
    description: '',
    type: type || 'user-story',
    status: 'backlog',
    priority: 'medium',
  });
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const item = itemId ? workItems.find((i) => i.id === itemId) : null;
  const isEditing = !!item;
  const parent = parentId ? workItems.find((i) => i.id === parentId) : null;
  const allowedTypes: WorkItemType[] = useMemo(() => {
    if (isEditing) return [item!.type];
    if (allowedTypesProp?.length) return allowedTypesProp;
    if (parent) return getAllowedChildTypes(parent.type);
    return ['company', 'product'];
  }, [isEditing, item, parent, allowedTypesProp]);

  useEffect(() => {
    if (item) {
      const status = item.type === 'feature' && !FEATURE_STATUSES.includes(item.status) ? 'funnel' : item.status;
      setFormData({
        title: item.title,
        description: item.description,
        type: item.type,
        status,
        priority: item.priority,
        assignee: item.assignee,
        tags: item.tags,
        size: item.size,
        storyPoints: item.storyPoints,
        acceptanceCriteria: item.acceptanceCriteria,
        estimatedDays: item.estimatedDays,
        estimatedHours: item.estimatedHours,
        parentId: item.parentId || parentId,
      });
    } else {
      const defaultType = (type && (allowedTypes.includes(type) || type === 'user-story')) ? type : allowedTypes[0];
      setFormData((prev) => ({
        ...prev,
        parentId,
        type: defaultType,
        ...(defaultStatus != null && { status: defaultStatus }),
        ...(defaultStatus == null && defaultType === 'feature' && { status: 'funnel' }),
      }));
    }
  }, [item, parentId, type, allowedTypes, defaultStatus]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (isEditing && itemId) {
      updateWorkItem(itemId, formData);
      onClose();
      return;
    }
    const newItem: WorkItem = {
      id: `item-${Date.now()}`,
      title: formData.title || '',
      description: formData.description,
      type: formData.type || 'user-story',
      status: formData.status || 'backlog',
      priority: formData.priority || 'medium',
      assignee: formData.assignee,
      tags: formData.tags,
      size: formData.size,
      storyPoints: formData.storyPoints,
      acceptanceCriteria: formData.acceptanceCriteria,
      estimatedDays: formData.estimatedDays,
      estimatedHours: formData.estimatedHours,
      parentId: formData.parentId,
      createdAt: new Date(),
      updatedAt: new Date(),
      color: formData.color,
    };
    setSaving(true);
    try {
      await addWorkItem(newItem);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setSubmitError(msg || 'Failed to save.');
      console.error('[WorkItemModal] addWorkItem failed:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleAddTask = () => {
    if (!item || item.type !== 'user-story') return;
    const newItem: WorkItem = {
      id: `item-${Date.now()}`,
      type: 'task',
      title: 'New task',
      status: 'backlog',
      priority: item.priority ?? 'medium',
      parentId: item.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    addWorkItem(newItem).catch((err) => console.error('[WorkItemModal] addWorkItem (task) failed:', err));
  };

  const handleAddBug = () => {
    if (!item || item.type !== 'user-story') return;
    const newItem: WorkItem = {
      id: `item-${Date.now()}`,
      type: 'bug',
      title: 'New bug',
      status: 'backlog',
      priority: item.priority ?? 'medium',
      parentId: item.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    addWorkItem(newItem).catch((err) => console.error('[WorkItemModal] addWorkItem (bug) failed:', err));
  };

  const childTasksAndBugs = item && item.type === 'user-story'
    ? getWorkItemsByParent(item.id).filter((i) => i.type === 'task' || i.type === 'bug')
    : [];

  return {
    formData,
    setFormData,
    submitError,
    saving,
    item,
    isEditing,
    parent,
    allowedTypes,
    handleSubmit,
    handleAddTask,
    handleAddBug,
    childTasksAndBugs,
    FEATURE_STATUSES,
  };
}

import React, { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import WorkItemModal from '../components/WorkItemModal';
import { getAllowedChildTypes, getTypeLabel } from '../utils/hierarchy';
import { WorkItem, WorkItemType } from '../types';
import { Plus, ChevronDown, ChevronRight } from 'lucide-react';

function buildTree(items: WorkItem[]): WorkItem[] {
  const byParent = new Map<string | undefined, WorkItem[]>();
  for (const item of items) {
    const key = item.parentId ?? '__root';
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(item);
  }
  const sortOrder: WorkItemType[] = ['epic', 'feature', 'user-story', 'task', 'bug'];
  for (const arr of byParent.values()) {
    arr.sort((a, b) => sortOrder.indexOf(a.type) - sortOrder.indexOf(b.type) || a.title.localeCompare(b.title));
  }
  return byParent.get('__root') ?? [];
}

function getChildren(items: WorkItem[], parentId: string): WorkItem[] {
  return items.filter((i) => i.parentId === parentId);
}

interface TreeRowProps {
  item: WorkItem;
  allItems: WorkItem[];
  depth: number;
  collapsed: Set<string>;
  onToggle: (id: string) => void;
  onAddChild: (parentId: string, type: WorkItemType) => void;
  onEdit: (itemId: string) => void;
}

const TreeRow: React.FC<TreeRowProps> = ({ item, allItems, depth, collapsed, onToggle, onAddChild, onEdit }) => {
  const children = getChildren(allItems, item.id);
  const hasChildren = children.length > 0;
  const isCollapsed = collapsed.has(item.id);
  const allowedChildTypes = getAllowedChildTypes(item.type);

  return (
    <div key={item.id}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '8px 12px',
          paddingLeft: `${12 + depth * 24}px`,
          borderBottom: '1px solid #e5e7eb',
          backgroundColor: '#ffffff',
          gap: '8px',
        }}
      >
        <button
          type="button"
          onClick={() => hasChildren && onToggle(item.id)}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: hasChildren ? 'pointer' : 'default',
            display: 'flex',
            alignItems: 'center',
            width: '24px',
          }}
        >
          {hasChildren ? isCollapsed ? <ChevronRight size={18} /> : <ChevronDown size={18} /> : <span style={{ width: 18 }} />}
        </button>
        <span
          style={{
            fontSize: '12px',
            color: '#6b7280',
            fontWeight: '600',
            textTransform: 'uppercase',
            minWidth: '80px',
          }}
        >
          {getTypeLabel(item.type)}
        </span>
        <button
          type="button"
          onClick={() => onEdit(item.id)}
          style={{
            flex: 1,
            textAlign: 'left',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px 0',
            fontSize: '14px',
            color: '#111827',
            fontWeight: '500',
          }}
        >
          {item.title}
        </button>
        {allowedChildTypes.length > 0 && (
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {allowedChildTypes.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => onAddChild(item.id, t)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 8px',
                  fontSize: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  backgroundColor: '#f9fafb',
                  color: '#374151',
                  cursor: 'pointer',
                }}
              >
                <Plus size={14} />
                Add {getTypeLabel(t)}
              </button>
            ))}
          </div>
        )}
      </div>
      {hasChildren && !isCollapsed &&
        children.map((child) => (
          <TreeRow
            key={child.id}
            item={child}
            allItems={allItems}
            depth={depth + 1}
            collapsed={collapsed}
            onToggle={onToggle}
            onAddChild={onAddChild}
            onEdit={onEdit}
          />
        ))}
    </div>
  );
};

const ProductBacklog: React.FC = () => {
  const { getProductBacklog, workItems, setSelectedWorkItem } = useStore();
  const [showModal, setShowModal] = useState(false);
  const [modalItemId, setModalItemId] = useState<string | null>(null);
  const [modalParentId, setModalParentId] = useState<string | undefined>(undefined);
  const [modalType, setModalType] = useState<WorkItemType | undefined>(undefined);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const backlog = getProductBacklog();
  const roots = useMemo(() => buildTree(backlog), [backlog]);

  const handleToggle = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAddEpic = () => {
    setModalItemId(null);
    setModalParentId(undefined);
    setModalType('epic');
    setShowModal(true);
  };

  const handleAddChild = (parentId: string, type: WorkItemType) => {
    setModalItemId(null);
    setModalParentId(parentId);
    setModalType(type);
    setShowModal(true);
  };

  const handleEdit = (itemId: string) => {
    setSelectedWorkItem(itemId);
    setModalItemId(itemId);
    setModalParentId(undefined);
    setModalType(undefined);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setModalItemId(null);
    setModalParentId(undefined);
    setModalType(undefined);
    setSelectedWorkItem(null);
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '32px', fontWeight: '700', color: '#111827' }}>
            Product Backlog
          </h1>
          <p style={{ margin: '8px 0 0 0', color: '#6b7280', fontSize: '14px' }}>
            Single source of truth for all work items. Epics contain Features, Features contain User Stories, User Stories contain Tasks and Bugs.
          </p>
        </div>
        <button
          onClick={handleAddEpic}
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
          Add Epic
        </button>
      </div>

      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          overflow: 'hidden',
        }}
      >
        {roots.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: '#6b7280' }}>
            No items in the backlog. Add an Epic to get started.
          </div>
        ) : (
          roots.map((item) => (
            <TreeRow
              key={item.id}
              item={item}
              allItems={workItems}
              depth={0}
              collapsed={collapsed}
              onToggle={handleToggle}
              onAddChild={handleAddChild}
              onEdit={handleEdit}
            />
          ))
        )}
      </div>

      {showModal && (
        <WorkItemModal
          itemId={modalItemId}
          onClose={handleCloseModal}
          parentId={modalParentId}
          type={modalType}
        />
      )}
    </div>
  );
};

export default ProductBacklog;

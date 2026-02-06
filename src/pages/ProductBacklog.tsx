import React, { useState, useMemo, useEffect, useRef } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { useStore } from '../store/useStore';
import WorkItemModal from '../components/WorkItemModal';
import { getAllowedChildTypes } from '../utils/hierarchy';
import { WorkItem, WorkItemType } from '../types';
import { compareWorkItemOrder } from '../utils/order';
import { Plus, ChevronDown, ChevronRight, ArrowLeft, GripVertical } from 'lucide-react';

function buildTree(items: WorkItem[]): WorkItem[] {
  const byParent = new Map<string | undefined, WorkItem[]>();
  for (const item of items) {
    const key = item.parentId ?? '__root';
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(item);
  }
  for (const arr of byParent.values()) {
    arr.sort(compareWorkItemOrder);
  }
  return byParent.get('__root') ?? [];
}

function getChildren(items: WorkItem[], parentId: string): WorkItem[] {
  return items.filter((i) => i.parentId === parentId).sort(compareWorkItemOrder);
}

/** When teamFilterId is set, return only items that are in the hierarchy of user-stories assigned to that team. */
function filterItemsByTeam(items: WorkItem[], teamFilterId: string): WorkItem[] {
  const byId = new Map(items.map((i) => [i.id, i]));
  const visibleIds = new Set<string>();
  const userStoriesForTeam = items.filter((i) => i.type === 'user-story' && i.teamId === teamFilterId);
  for (const us of userStoriesForTeam) {
    visibleIds.add(us.id);
    let current: WorkItem | undefined = us;
    while (current?.parentId) {
      visibleIds.add(current.parentId);
      current = byId.get(current.parentId);
    }
    const stack = [us.id];
    while (stack.length) {
      const id = stack.pop()!;
      for (const i of items) {
        if (i.parentId === id && !visibleIds.has(i.id)) {
          visibleIds.add(i.id);
          stack.push(i.id);
        }
      }
    }
  }
  return items.filter((i) => visibleIds.has(i.id));
}

/** When selectedTypes is non-empty, return only items of those types plus their ancestors and descendants. */
function filterItemsByType(items: WorkItem[], selectedTypes: WorkItemType[]): WorkItem[] {
  if (selectedTypes.length === 0) return items;
  const byId = new Map(items.map((i) => [i.id, i]));
  const visibleIds = new Set<string>();
  const typeSet = new Set(selectedTypes);
  const seeds = items.filter((i) => typeSet.has(i.type));
  for (const item of seeds) {
    visibleIds.add(item.id);
    let current: WorkItem | undefined = item;
    while (current?.parentId) {
      visibleIds.add(current.parentId);
      current = byId.get(current.parentId);
    }
    const stack = [item.id];
    while (stack.length) {
      const id = stack.pop()!;
      for (const i of items) {
        if (i.parentId === id && !visibleIds.has(i.id)) {
          visibleIds.add(i.id);
          stack.push(i.id);
        }
      }
    }
  }
  return items.filter((i) => visibleIds.has(i.id));
}

const BACKLOG_TYPE_OPTIONS: WorkItemType[] = ['product', 'epic', 'feature', 'user-story', 'task', 'bug'];

const DROPPABLE_TYPES: WorkItemType[] = ['product', 'epic', 'feature', 'user-story', 'task', 'bug'];

interface BacklogTreeRowProps {
  item: WorkItem;
  depth: number;
  hasChildren: boolean;
  isCollapsed: boolean;
  allowedChildTypes: WorkItemType[];
  getTypeLabel: (type: WorkItemType) => string;
  onToggle: (id: string) => void;
  onEdit: (itemId: string) => void;
  onAddChild: (parentId: string, type: WorkItemType) => void;
  showGrip: boolean;
  dragHandleProps?: object | null;
}

const BacklogTreeRow: React.FC<BacklogTreeRowProps> = ({
  item,
  depth,
  hasChildren,
  isCollapsed,
  allowedChildTypes,
  getTypeLabel,
  onToggle,
  onEdit,
  onAddChild,
  showGrip,
  dragHandleProps,
}) => (
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
    {showGrip ? (
      <span style={{ display: 'flex', alignItems: 'center', cursor: 'grab' }} title="Drag to reorder" {...(dragHandleProps ?? {})}>
        <GripVertical size={16} color="#9ca3af" />
      </span>
    ) : (
      <span style={{ width: 24, display: 'inline-block' }} />
    )}
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
      {item.type === 'feature' && item.wsjfScore != null && (
        <span style={{ marginLeft: '8px', fontSize: '12px', color: '#6b7280', fontWeight: '400' }}>WSJF: {item.wsjfScore.toFixed(2)}</span>
      )}
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
);

interface DroppableTreeBlockProps {
  droppableId: string;
  items: WorkItem[];
  allItems: WorkItem[];
  depth: number;
  collapsed: Set<string>;
  onToggle: (id: string) => void;
  onAddChild: (parentId: string, type: WorkItemType) => void;
  onEdit: (itemId: string) => void;
  getTypeLabel: (type: WorkItemType) => string;
}

const DroppableTreeBlock: React.FC<DroppableTreeBlockProps> = ({
  droppableId,
  items,
  allItems,
  depth,
  collapsed,
  onToggle,
  onAddChild,
  onEdit,
  getTypeLabel,
}) => {
  const canDrag = items.length > 1 && items.some((i) => DROPPABLE_TYPES.includes(i.type));
  return (
    <Droppable droppableId={droppableId}>
      {(droppableProvided) => (
        <div ref={droppableProvided.innerRef} {...droppableProvided.droppableProps}>
          {items.map((item, index) => {
            const children = getChildren(allItems, item.id);
            const hasChildren = children.length > 0;
            const isCollapsed = collapsed.has(item.id);
            const allowedChildTypes = getAllowedChildTypes(item.type);
            const isDraggable = canDrag && DROPPABLE_TYPES.includes(item.type);
            return (
              <Draggable key={item.id} draggableId={item.id} index={index} isDragDisabled={!isDraggable}>
                {(draggableProvided) => (
                  <div ref={draggableProvided.innerRef} {...draggableProvided.draggableProps}>
                    <BacklogTreeRow
                      item={item}
                      depth={depth}
                      hasChildren={hasChildren}
                      isCollapsed={isCollapsed}
                      allowedChildTypes={allowedChildTypes}
                      getTypeLabel={getTypeLabel}
                      onToggle={onToggle}
                      onEdit={onEdit}
                      onAddChild={onAddChild}
                      showGrip={isDraggable}
                      dragHandleProps={isDraggable ? draggableProvided.dragHandleProps : undefined}
                    />
                    {hasChildren && !isCollapsed && (
                      <DroppableTreeBlock
                        droppableId={item.id}
                        items={children}
                        allItems={allItems}
                        depth={depth + 1}
                        collapsed={collapsed}
                        onToggle={onToggle}
                        onAddChild={onAddChild}
                        onEdit={onEdit}
                        getTypeLabel={getTypeLabel}
                      />
                    )}
                  </div>
                )}
              </Draggable>
            );
          })}
          {droppableProvided.placeholder}
        </div>
      )}
    </Droppable>
  );
};

const ProductBacklog: React.FC = () => {
  const {
    workItems,
    setSelectedWorkItem,
    selectedProductId,
    setSelectedProductId,
    getProductBacklogItems,
    getTypeLabel,
    teams,
    loadTeams,
    currentTenantId,
    updateWorkItem,
  } = useStore();
  const [showModal, setShowModal] = useState(false);
  const [modalItemId, setModalItemId] = useState<string | null>(null);
  const [modalParentId, setModalParentId] = useState<string | undefined>(undefined);
  const [modalType, setModalType] = useState<WorkItemType | undefined>(undefined);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [teamFilterId, setTeamFilterId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<WorkItemType[]>([]);
  const [typeFilterOpen, setTypeFilterOpen] = useState(false);
  const typeFilterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (typeFilterOpen && typeFilterRef.current && !typeFilterRef.current.contains(e.target as Node)) setTypeFilterOpen(false);
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, [typeFilterOpen]);

  useEffect(() => {
    if (currentTenantId) loadTeams(currentTenantId);
  }, [currentTenantId, loadTeams]);

  const product = selectedProductId ? workItems.find((i) => i.id === selectedProductId) : null;
  const allItems = useMemo(() => {
    if (selectedProductId && product) return getProductBacklogItems(selectedProductId);
    return workItems;
  }, [selectedProductId, product, workItems, getProductBacklogItems]);
  const filteredItems = useMemo(() => {
    let result = allItems;
    if (teamFilterId) result = filterItemsByTeam(result, teamFilterId);
    if (typeFilter.length) result = filterItemsByType(result, typeFilter);
    return result;
  }, [allItems, teamFilterId, typeFilter]);
  const roots = useMemo(() => {
    if (product && filteredItems.some((i) => i.id === product.id)) return [product];
    if (product) return [];
    return buildTree(filteredItems);
  }, [product, filteredItems]);

  const handleToggle = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBackToAll = () => {
    setSelectedProductId(null);
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

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || result.source.droppableId !== result.destination.droppableId || result.source.index === result.destination.index) return;
    const parentId = result.source.droppableId === '__root' ? undefined : result.source.droppableId;
    const siblings = parentId ? getChildren(filteredItems, parentId) : roots;
    const reordered = Array.from(siblings);
    const [removed] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, removed);
    reordered.forEach((item, index) => updateWorkItem(item.id, { order: index }));
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          {product && (
            <button
              type="button"
              onClick={handleBackToAll}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginBottom: '8px',
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
              All products
            </button>
          )}
          <h1 style={{ margin: 0, fontSize: '32px', fontWeight: '700', color: '#111827' }}>
            {product ? `${getTypeLabel('product')} Backlog: ${product.title}` : `${getTypeLabel('product')} Backlog`}
          </h1>
          <p style={{ margin: '8px 0 0 0', color: '#6b7280', fontSize: '14px' }}>
            {product
              ? `Backlog for ${product.title}. ${getTypeLabel('epic')}s, ${getTypeLabel('feature')}s, User Stories, Tasks and Bugs.`
              : `Single source of truth for all work items. Products contain ${getTypeLabel('epic')}s, ${getTypeLabel('epic')}s contain ${getTypeLabel('feature')}s, ${getTypeLabel('feature')}s contain User Stories, User Stories contain Tasks and Bugs.`}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div ref={typeFilterRef} style={{ position: 'relative' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
              Item types:
            </label>
            <button
              type="button"
              onClick={() => setTypeFilterOpen((o) => !o)}
              style={{
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                minWidth: '160px',
                backgroundColor: '#fff',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
              }}
            >
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {typeFilter.length === 0
                  ? 'All types'
                  : typeFilter.length <= 2
                    ? typeFilter.map((t) => getTypeLabel(t)).join(', ')
                    : `${getTypeLabel(typeFilter[0])}, ${getTypeLabel(typeFilter[1])} +${typeFilter.length - 2}`}
              </span>
              <ChevronDown size={16} style={{ flexShrink: 0 }} />
            </button>
            {typeFilterOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  marginTop: '4px',
                  backgroundColor: '#fff',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  padding: '8px',
                  minWidth: '200px',
                  zIndex: 1000,
                }}
              >
                {BACKLOG_TYPE_OPTIONS.map((t) => (
                  <label
                    key={t}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', cursor: 'pointer', fontSize: '14px' }}
                  >
                    <input
                      type="checkbox"
                      checked={typeFilter.includes(t)}
                      onChange={() => {
                        setTypeFilter((prev) =>
                          prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
                        );
                      }}
                    />
                    {getTypeLabel(t)}
                  </label>
                ))}
                <div style={{ borderTop: '1px solid #e5e7eb', marginTop: '6px', paddingTop: '6px', display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setTypeFilter([])}
                    style={{ padding: '4px 8px', fontSize: '12px', border: '1px solid #d1d5db', borderRadius: '4px', background: '#fff', cursor: 'pointer' }}
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={() => setTypeFilterOpen(false)}
                    style={{ padding: '4px 8px', fontSize: '12px', border: '1px solid #3b82f6', borderRadius: '4px', background: '#3b82f6', color: '#fff', cursor: 'pointer' }}
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '500', color: '#374151' }}>
            Team:
            <select
              value={teamFilterId ?? ''}
              onChange={(e) => setTeamFilterId(e.target.value || null)}
              style={{
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                minWidth: '160px',
              }}
            >
              <option value="">All teams</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
        </div>
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
            No items in the backlog. Select a product from the home page to view its backlog, or add a product from the home page if you have permission.
          </div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <DroppableTreeBlock
              droppableId="__root"
              items={roots}
              allItems={filteredItems}
              depth={0}
              collapsed={collapsed}
              onToggle={handleToggle}
              onAddChild={handleAddChild}
              onEdit={handleEdit}
              getTypeLabel={getTypeLabel}
            />
          </DragDropContext>
        )}
      </div>

      {showModal && (
        <WorkItemModal
          itemId={modalItemId}
          onClose={handleCloseModal}
          parentId={modalParentId}
          type={modalType}
          onSelectWorkItem={(id) => setModalItemId(id)}
        />
      )}
    </div>
  );
};

export default ProductBacklog;

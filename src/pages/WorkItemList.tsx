import React, { useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import WorkItemModal from '../components/WorkItemModal';
import { getTypeLabel } from '../utils/hierarchy';
import { WorkItem, WorkItemType } from '../types';
import { Filter } from 'lucide-react';

const ALL_TYPES: WorkItemType[] = ['product', 'epic', 'feature', 'user-story', 'task', 'bug'];

export interface ListViewFilters {
  types: WorkItemType[];
}

const defaultFilters: ListViewFilters = {
  types: [],
};

function applyFilters(items: WorkItem[], filters: ListViewFilters): WorkItem[] {
  let result = items;
  if (filters.types.length > 0) {
    result = result.filter((item) => filters.types.includes(item.type));
  }
  return result;
}

const WorkItemList: React.FC = () => {
  const { workItems, getProductBacklog, setSelectedWorkItem } = useStore();
  const [filters, setFilters] = useState<ListViewFilters>(defaultFilters);
  const [showModal, setShowModal] = useState(false);
  const [modalItemId, setModalItemId] = useState<string | null>(null);

  const backlog = getProductBacklog();
  const filteredItems = useMemo(() => applyFilters(backlog, filters), [backlog, filters]);

  const toggleTypeFilter = (type: WorkItemType) => {
    setFilters((prev) => {
      const currentlyShowing = prev.types.length === 0 ? ALL_TYPES : prev.types;
      const isChecked = currentlyShowing.includes(type);
      let next: WorkItemType[];
      if (isChecked) {
        next = currentlyShowing.filter((t) => t !== type);
      } else {
        next = [...currentlyShowing, type].sort((a, b) => ALL_TYPES.indexOf(a) - ALL_TYPES.indexOf(b));
      }
      return { ...prev, types: next.length === ALL_TYPES.length ? [] : next };
    });
  };

  const clearTypeFilter = () => {
    setFilters((prev) => ({ ...prev, types: [] }));
  };

  const handleRowClick = (itemId: string) => {
    setSelectedWorkItem(itemId);
    setModalItemId(itemId);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setModalItemId(null);
    setSelectedWorkItem(null);
  };

  const getParentTitle = (item: WorkItem): string => {
    if (!item.parentId) return '—';
    const parent = workItems.find((i) => i.id === item.parentId);
    return parent ? parent.title : item.parentId;
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ margin: 0, fontSize: '32px', fontWeight: '700', color: '#111827' }}>
          Work Items
        </h1>
        <p style={{ margin: '8px 0 0 0', color: '#6b7280', fontSize: '14px' }}>
          List view of all work items. Use filters to narrow results.
        </p>
      </div>

      {/* Filters – structured for adding more filters later */}
      <div
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Filter size={18} color="#6b7280" />
          <span style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>Filters</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '13px', color: '#6b7280', fontWeight: '500' }}>Type</span>
            {ALL_TYPES.map((type) => (
              <label
                key={type}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: '#374151',
                }}
              >
                <input
                  type="checkbox"
                  checked={
                    filters.types.length === 0 ? true : filters.types.includes(type)
                  }
                  onChange={() => toggleTypeFilter(type)}
                  style={{ width: '16px', height: '16px' }}
                />
                {getTypeLabel(type)}
              </label>
            ))}
          </div>
          {(filters.types.length > 0 && filters.types.length < ALL_TYPES.length) && (
            <button
              type="button"
              onClick={clearTypeFilter}
              style={{
                padding: '6px 12px',
                fontSize: '13px',
                color: '#3b82f6',
                backgroundColor: 'transparent',
                border: '1px solid #93c5fd',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '500',
              }}
            >
              Clear type filter
            </button>
          )}
        </div>
        {/* Placeholder for future filters – e.g. Status, Assignee, Priority */}
      </div>

      <div
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          overflow: 'hidden',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: '600', color: '#374151' }}>Unique ID</th>
                <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: '600', color: '#374151' }}>Type</th>
                <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: '600', color: '#374151' }}>Name</th>
                <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: '600', color: '#374151' }}>Description</th>
                <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: '600', color: '#374151' }}>Status</th>
                <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: '600', color: '#374151' }}>Priority</th>
                <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: '600', color: '#374151' }}>Assignee</th>
                <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: '600', color: '#374151' }}>Parent</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: '#6b7280' }}>
                    No work items match the current filters.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => handleRowClick(item.id)}
                    style={{
                      borderBottom: '1px solid #e5e7eb',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f9fafb';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#ffffff';
                    }}
                  >
                    <td style={{ padding: '12px 16px', color: '#6b7280', fontSize: '13px', fontFamily: 'monospace' }} title={item.id}>
                      {item.id.length > 20 ? `${item.id.slice(0, 20)}…` : item.id}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#6b7280', textTransform: 'uppercase', fontWeight: '600', fontSize: '12px' }}>
                      {getTypeLabel(item.type)}
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: '500', color: '#111827' }}>{item.title}</td>
                    <td style={{ padding: '12px 16px', color: '#6b7280', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.description ?? ''}>
                      {item.description ?? '—'}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#6b7280' }}>{item.status}</td>
                    <td style={{ padding: '12px 16px', color: '#6b7280' }}>{item.priority ?? '—'}</td>
                    <td style={{ padding: '12px 16px', color: '#6b7280' }}>{item.assignee ?? '—'}</td>
                    <td style={{ padding: '12px 16px', color: '#6b7280', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={getParentTitle(item)}>
                      {getParentTitle(item)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <WorkItemModal itemId={modalItemId} onClose={handleCloseModal} />
      )}
    </div>
  );
};

export default WorkItemList;

import React from 'react';
import { useStore } from '../store/useStore';
import { ChevronRight } from 'lucide-react';

interface WorkItemHierarchyProps {
  itemId: string;
}

const WorkItemHierarchy: React.FC<WorkItemHierarchyProps> = ({ itemId }) => {
  const { workItems, getWorkItemsByParent, getTypeLabel } = useStore();
  const item = workItems.find((i) => i.id === itemId);
  
  if (!item) return null;

  const children = getWorkItemsByParent(itemId);
  const parent = item.parentId ? workItems.find((i) => i.id === item.parentId) : null;

  return (
    <div style={{ marginTop: '24px', padding: '16px', backgroundColor: '#f9fafb', borderRadius: '8px' }}>
      <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600' }}>Hierarchy</h3>
      
      {parent && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Parent</div>
          <div style={{ 
            padding: '8px 12px', 
            backgroundColor: '#ffffff', 
            borderRadius: '6px',
            border: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <span style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase' }}>
              {getTypeLabel(parent.type)}
            </span>
            <ChevronRight size={14} color="#9ca3af" />
            <span style={{ fontSize: '14px', fontWeight: '500' }}>{parent.title}</span>
          </div>
        </div>
      )}

      {children.length > 0 && (
        <div>
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>
            Children ({children.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {children.map((child) => (
              <div
                key={child.id}
                style={{
                  padding: '8px 12px',
                  backgroundColor: '#ffffff',
                  borderRadius: '6px',
                  border: '1px solid #e5e7eb',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase' }}>
                  {getTypeLabel(child.type)}
                </span>
                <ChevronRight size={14} color="#9ca3af" />
                <span style={{ fontSize: '14px', fontWeight: '500' }}>{child.title}</span>
                <span style={{ 
                  marginLeft: 'auto',
                  fontSize: '11px',
                  padding: '2px 6px',
                  backgroundColor: '#f3f4f6',
                  borderRadius: '4px',
                  color: '#6b7280',
                }}>
                  {child.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkItemHierarchy;

import React from 'react';
import { WorkItem } from '../types';
import { getStatusColor } from '../utils/boardConfig';
import { getTypeLabel } from '../utils/hierarchy';
import { getSizeLabel, formatStoryPoints } from '../utils/estimates';
import { useStore } from '../store/useStore';

interface WorkItemCardProps {
  item: WorkItem;
  onClick?: () => void;
}

const WorkItemCard: React.FC<WorkItemCardProps> = ({ item, onClick }) => {
  const { setSelectedWorkItem, getAggregatedStoryPoints } = useStore();

  const handleClick = () => {
    setSelectedWorkItem(item.id);
    onClick?.();
  };

  const priorityColors = {
    low: '#6b7280',
    medium: '#3b82f6',
    high: '#f59e0b',
    critical: '#ef4444',
  };

  return (
    <div
      onClick={handleClick}
      style={{
        backgroundColor: '#ffffff',
        border: `2px solid ${item.color || getStatusColor(item.status)}`,
        borderRadius: '8px',
        padding: '12px',
        cursor: 'pointer',
        transition: 'all 0.2s',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.15)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ 
            fontSize: '12px', 
            color: '#6b7280', 
            textTransform: 'uppercase',
            marginBottom: '4px',
            fontWeight: '600',
          }}>
            {getTypeLabel(item.type)}
          </div>
          <h4 style={{ 
            margin: 0, 
            fontSize: '14px', 
            fontWeight: '600', 
            color: '#111827',
            lineHeight: '1.4',
          }}>
            {item.title}
          </h4>
        </div>
        {item.priority && (
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: priorityColors[item.priority],
              flexShrink: 0,
              marginLeft: '8px',
            }}
            title={item.priority}
          />
        )}
      </div>
      
      {item.description && (
        <p style={{ 
          fontSize: '12px', 
          color: '#6b7280', 
          margin: '8px 0 0 0',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {item.description}
        </p>
      )}
      
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginTop: '12px',
        fontSize: '11px',
        color: '#9ca3af',
      }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {(item.type === 'epic' || item.type === 'feature') && item.size && (
            <span>Size: {getSizeLabel(item.size)}</span>
          )}
          {item.type === 'feature' && (
            <span>{getAggregatedStoryPoints(item.id)} pts</span>
          )}
          {item.type === 'user-story' && (
            <span>{formatStoryPoints(item.storyPoints)} pts</span>
          )}
          {(item.type === 'task' || item.type === 'bug') && item.estimatedHours != null && (
            <span>⏱ {item.estimatedHours}h</span>
          )}
          {item.assignee && (
            <span>👤 {item.assignee}</span>
          )}
        </div>
        {item.tags && item.tags.length > 0 && (
          <div style={{ display: 'flex', gap: '4px' }}>
            {item.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                style={{
                  backgroundColor: '#f3f4f6',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontSize: '10px',
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkItemCard;

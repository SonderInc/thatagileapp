import React from 'react';
import { WorkItem } from '../types';
import { getStatusColor } from '../utils/boardConfig';
import { getSizeLabel, formatStoryPoints, formatDays } from '../utils/estimates';
import { useStore } from '../store/useStore';

interface WorkItemCardProps {
  item: WorkItem;
  onClick?: () => void;
  /** Half-height card for tasks/bugs under user stories on Team Board */
  compact?: boolean;
  /** Override border color (e.g. Ready-column story with task in progress = green) */
  borderColorOverride?: string;
}

const WorkItemCard: React.FC<WorkItemCardProps> = ({ item, onClick, compact, borderColorOverride }) => {
  const { setSelectedWorkItem, getAggregatedStoryPoints, getTypeLabel } = useStore();

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

  const padding = compact ? 6 : 12;
  const typeFontSize = compact ? 10 : 12;
  const titleFontSize = compact ? 12 : 14;
  const metaFontSize = compact ? 10 : 11;
  const marginTop = compact ? 6 : 12;

  return (
    <div
      onClick={handleClick}
      style={{
        backgroundColor: '#ffffff',
        border: `2px solid ${borderColorOverride ?? item.color ?? (item.type === 'product' ? '#d1d5db' : getStatusColor(item.status))}`,
        borderRadius: compact ? 6 : 8,
        padding,
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: compact ? 2 : 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: typeFontSize,
            color: '#6b7280',
            textTransform: 'uppercase',
            marginBottom: compact ? 2 : 4,
            fontWeight: '600',
          }}>
            {getTypeLabel(item.type)}
          </div>
          <h4 style={{
            margin: 0,
            fontSize: titleFontSize,
            fontWeight: '600',
            color: '#111827',
            lineHeight: 1.3,
          }}>
            {item.title}
          </h4>
        </div>
        {item.priority && item.type !== 'product' && (
          <div
            style={{
              width: compact ? 6 : 8,
              height: compact ? 6 : 8,
              borderRadius: '50%',
              backgroundColor: priorityColors[item.priority],
              flexShrink: 0,
              marginLeft: 6,
            }}
            title={item.priority}
          />
        )}
      </div>

      {!compact && item.description && (
        <p style={{
          fontSize: 12,
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

      {compact && item.description && (
        <p style={{
          fontSize: 10,
          color: '#6b7280',
          margin: '2px 0 0 0',
          display: '-webkit-box',
          WebkitLineClamp: 1,
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
        marginTop,
        fontSize: metaFontSize,
        color: '#9ca3af',
      }}>
        <div style={{ display: 'flex', gap: compact ? 4 : 8, alignItems: 'center' }}>
          {(item.type === 'epic' || item.type === 'feature') && item.size && (
            <span>Size: {getSizeLabel(item.size)}</span>
          )}
          {item.type === 'feature' && (
            <span>{getAggregatedStoryPoints(item.id)} pts</span>
          )}
          {item.type === 'feature' && item.wsjfScore != null && (
            <span>WSJF: {item.wsjfScore.toFixed(2)}</span>
          )}
          {item.type === 'user-story' && (
            <span>{formatStoryPoints(item.storyPoints)} pts</span>
          )}
          {(item.type === 'task' || item.type === 'bug') && (item.estimatedDays != null || item.estimatedHours != null) && (
            <span>{item.estimatedDays != null ? `${formatDays(item.estimatedDays)} days` : `⏱ ${item.estimatedHours}h`}</span>
          )}
          {item.assignee && (
            <span>👤 {item.assignee}</span>
          )}
        </div>
        {!compact && item.tags && item.tags.length > 0 && (
          <div style={{ display: 'flex', gap: 4 }}>
            {item.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                style={{
                  backgroundColor: '#f3f4f6',
                  padding: '2px 6px',
                  borderRadius: 4,
                  fontSize: 10,
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

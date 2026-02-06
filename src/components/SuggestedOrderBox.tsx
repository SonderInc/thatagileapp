import React from 'react';

interface SuggestedOrderBoxProps {
  orderedIds: string[];
  items: Array<{ id: string; title: string }>;
  onApply: () => void;
}

const SuggestedOrderBox: React.FC<SuggestedOrderBoxProps> = ({ orderedIds, items, onApply }) => {
  const byId = new Map(items.map((i) => [i.id, i]));
  return (
    <div
      style={{
        marginBottom: '12px',
        padding: '12px',
        backgroundColor: '#f5f3ff',
        borderRadius: '6px',
        border: '1px solid #c4b5fd',
      }}
    >
      <div
        style={{
          fontSize: '13px',
          fontWeight: '600',
          color: '#5b21b6',
          marginBottom: '8px',
        }}
      >
        Suggested order
      </div>
      <ol style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#374151' }}>
        {orderedIds.map((id) => {
          const item = byId.get(id);
          return <li key={id}>{item ? item.title : id}</li>;
        })}
      </ol>
      <button
        type="button"
        onClick={onApply}
        style={{
          marginTop: '8px',
          padding: '6px 12px',
          border: 'none',
          borderRadius: '6px',
          backgroundColor: '#6d28d9',
          color: '#fff',
          cursor: 'pointer',
          fontSize: '13px',
          fontWeight: '500',
        }}
      >
        Apply
      </button>
    </div>
  );
};

export default SuggestedOrderBox;

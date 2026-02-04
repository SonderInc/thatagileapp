import React from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { useStore } from '../store/useStore';
import { KanbanColumn, WorkItem, KanbanLane } from '../types';
import { getStatusColor, getStatusForKanbanColumn, isStatusInKanbanColumn } from '../utils/boardConfig';
import WorkItemCard from './WorkItemCard';

interface KanbanModeBoardProps {
  boardId: string;
  columns: KanbanColumn[];
  lanes: { id: KanbanLane; title: string }[];
  getItemsForLane: (laneId: string) => WorkItem[];
  onAddItem?: (columnId: string) => void;
  onOpenItem?: (itemId: string) => void;
}

const LANE_LABEL_WIDTH = 280;
const COLUMN_MIN_WIDTH = 280;

const KanbanModeBoard: React.FC<KanbanModeBoardProps> = ({
  boardId,
  columns,
  lanes,
  getItemsForLane,
  onAddItem,
  onOpenItem,
}) => {
  const { moveWorkItem, setSelectedWorkItem } = useStore();

  const handleOpenItem = (itemId: string) => {
    setSelectedWorkItem(itemId);
    onOpenItem?.(itemId);
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const columnId = result.destination.droppableId.split('::')[0];
    const newStatus = getStatusForKanbanColumn(columnId);
    moveWorkItem(result.draggableId, newStatus, columnId);
  };

  const getItemsInCell = (laneId: string, columnId: string): WorkItem[] =>
    getItemsForLane(laneId).filter((i) => isStatusInKanbanColumn(i.status, columnId));

  return (
    <DragDropContext key={boardId} onDragEnd={handleDragEnd}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          padding: '20px',
          overflowX: 'auto',
          minHeight: '600px',
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
        }}
      >
        {/* Header row: lane label + column names */}
        <div
          style={{
            display: 'flex',
            flexShrink: 0,
            borderBottom: '2px solid #e5e7eb',
          }}
        >
          <div
            style={{
              width: LANE_LABEL_WIDTH,
              minWidth: LANE_LABEL_WIDTH,
              padding: '12px 8px',
              fontSize: '12px',
              fontWeight: '600',
              color: '#6b7280',
              textTransform: 'uppercase',
            }}
          >
            Lane
          </div>
          {columns.map((column) => (
            <div
              key={column.id}
              style={{
                minWidth: COLUMN_MIN_WIDTH,
                width: COLUMN_MIN_WIDTH,
                padding: '12px 8px',
                borderLeft: '1px solid #e5e7eb',
              }}
            >
              <div
                style={{
                  height: '4px',
                  backgroundColor: getStatusColor(column.status),
                  borderRadius: '2px',
                  marginBottom: '8px',
                }}
              />
              <h3 style={{ margin: 0, fontSize: '14px', fontWeight: '600', color: '#111827' }}>
                {column.name}
              </h3>
              {onAddItem && column.id === 'backlog' && (
                <button
                  onClick={() => onAddItem(column.id)}
                  style={{
                    marginTop: '8px',
                    padding: '6px',
                    border: '1px dashed #d1d5db',
                    borderRadius: '6px',
                    backgroundColor: 'transparent',
                    color: '#6b7280',
                    cursor: 'pointer',
                    fontSize: '12px',
                    width: '100%',
                  }}
                >
                  Add Item
                </button>
              )}
            </div>
          ))}
        </div>

        {/* One row per swimlane */}
        {lanes.map((lane, laneIndex) => {
          const isEven = laneIndex % 2 === 0;
          const laneItems = getItemsForLane(lane.id);
          const maxCardCount = Math.max(
            0,
            ...columns.map((col) => getItemsInCell(lane.id, col.id).length)
          );
          const laneMinHeight = Math.max(60, 24 + maxCardCount * 52);

          return (
            <div
              key={lane.id}
              style={{
                display: 'flex',
                alignItems: 'stretch',
                flexShrink: 0,
                borderTop: '2px solid #e5e7eb',
                borderBottom: '2px solid #e5e7eb',
                minHeight: laneMinHeight,
                backgroundColor: isEven ? '#fafafa' : '#ffffff',
              }}
            >
              <div
                style={{
                  width: LANE_LABEL_WIDTH,
                  minWidth: LANE_LABEL_WIDTH,
                  padding: '8px',
                  borderRight: '1px solid #e5e7eb',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#6b7280',
                  textTransform: 'uppercase',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {lane.title}
              </div>
              {columns.map((column) => {
                const columnId = column.id;
                const droppableId = `${columnId}::${lane.id}`;
                const cellItems = getItemsInCell(lane.id, columnId);

                return (
                  <div
                    key={droppableId}
                    style={{
                      minWidth: COLUMN_MIN_WIDTH,
                      width: COLUMN_MIN_WIDTH,
                      borderLeft: '1px solid #e5e7eb',
                      padding: '8px',
                      overflowY: 'auto',
                      maxHeight: '400px',
                    }}
                  >
                    <Droppable droppableId={droppableId}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          style={{
                            minHeight: '40px',
                            backgroundColor: snapshot.isDraggingOver ? '#f9fafb' : 'transparent',
                            borderRadius: '6px',
                            padding: '4px',
                          }}
                        >
                          {cellItems.map((item, index) => (
                            <Draggable key={item.id} draggableId={item.id} index={index}>
                              {(providedItem, snapshotItem) => (
                                <div
                                  ref={providedItem.innerRef}
                                  {...providedItem.draggableProps}
                                  {...providedItem.dragHandleProps}
                                  style={{
                                    ...providedItem.draggableProps.style,
                                    opacity: snapshotItem.isDragging ? 0.8 : 1,
                                    marginBottom: '6px',
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenItem(item.id);
                                  }}
                                >
                                  <WorkItemCard item={item} compact />
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
};

export default KanbanModeBoard;

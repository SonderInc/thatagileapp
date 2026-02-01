import React from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { useStore } from '../store/useStore';
import { KanbanColumn, WorkItem } from '../types';
import { getStatusColor } from '../utils/boardConfig';
import WorkItemCard from './WorkItemCard';
import { Plus } from 'lucide-react';

interface KanbanBoardProps {
  boardId: string;
  columns: KanbanColumn[];
  workItems: WorkItem[];
  onAddItem?: (columnId: string) => void;
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({ boardId, columns, workItems, onAddItem }) => {
  const { moveWorkItem } = useStore();

  const boardKey = boardId;

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const { draggableId, destination } = result;
    const newStatus = destination.droppableId as WorkItem['status'];
    
    moveWorkItem(draggableId, newStatus, destination.droppableId);
  };

  const getItemsForColumn = (columnId: string): WorkItem[] => {
    return workItems.filter((item) => item.status === columnId);
  };

  return (
    <DragDropContext key={boardKey} onDragEnd={handleDragEnd}>
      <div className="kanban-board" style={{ display: 'flex', gap: '16px', padding: '20px', overflowX: 'auto', minHeight: '600px' }}>
        {columns.map((column) => {
          const columnItems = getItemsForColumn(column.id);
          
          return (
            <Droppable key={column.id} droppableId={column.id}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  style={{
                    backgroundColor: snapshot.isDraggingOver ? '#f3f4f6' : '#ffffff',
                    borderRadius: '8px',
                    padding: '16px',
                    minWidth: '300px',
                    border: '1px solid #e5e7eb',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#111827' }}>
                      {column.name}
                    </h3>
                    <span style={{ 
                      backgroundColor: '#f3f4f6', 
                      padding: '4px 8px', 
                      borderRadius: '12px', 
                      fontSize: '12px',
                      color: '#6b7280'
                    }}>
                      {columnItems.length}
                    </span>
                  </div>
                  
                  <div style={{ 
                    width: '100%', 
                    height: '4px', 
                    backgroundColor: getStatusColor(column.status),
                    borderRadius: '2px',
                    marginBottom: '12px'
                  }} />
                  
                  <div style={{ flex: 1, minHeight: '100px' }}>
                    {columnItems.map((item, index) => (
                      <Draggable key={item.id} draggableId={item.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            style={{
                              ...provided.draggableProps.style,
                              opacity: snapshot.isDragging ? 0.8 : 1,
                              marginBottom: '8px',
                            }}
                          >
                            <WorkItemCard item={item} />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                  
                  {onAddItem && (
                    <button
                      onClick={() => onAddItem(column.id)}
                      style={{
                        marginTop: '12px',
                        padding: '8px',
                        border: '1px dashed #d1d5db',
                        borderRadius: '6px',
                        backgroundColor: 'transparent',
                        color: '#6b7280',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        fontSize: '14px',
                        width: '100%',
                      }}
                    >
                      <Plus size={16} />
                      Add Item
                    </button>
                  )}
                </div>
              )}
            </Droppable>
          );
        })}
      </div>
    </DragDropContext>
  );
};

export default KanbanBoard;

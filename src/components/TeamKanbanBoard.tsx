import React from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { useStore } from '../store/useStore';
import { KanbanColumn, WorkItem, WorkItemStatus } from '../types';
import { getStatusColor, getStatusForTeamColumn, isStatusInTeamColumn } from '../utils/boardConfig';
import WorkItemCard from './WorkItemCard';
import { Check } from 'lucide-react';

const BACKLOG_STATUSES: WorkItemStatus[] = ['backlog', 'to-do'];

function isBacklogStatus(s: WorkItemStatus): boolean {
  return BACKLOG_STATUSES.includes(s);
}

interface TeamKanbanBoardProps {
  boardId: string;
  columns: KanbanColumn[];
  features: WorkItem[];
  onAddItem?: (columnId: string) => void;
  onOpenItem?: (itemId: string) => void;
}

const TeamKanbanBoard: React.FC<TeamKanbanBoardProps> = ({
  boardId,
  columns,
  features,
  onAddItem,
  onOpenItem,
}) => {
  const { workItems, moveWorkItem, setSelectedWorkItem } = useStore();

  const handleOpenItem = (itemId: string) => {
    setSelectedWorkItem(itemId);
    onOpenItem?.(itemId);
  };

  const getStoriesForFeature = (featureId: string): WorkItem[] =>
    workItems.filter((i) => i.parentId === featureId && i.type === 'user-story');

  const getTasksForStory = (storyId: string): WorkItem[] =>
    workItems.filter(
      (i) => i.parentId === storyId && (i.type === 'task' || i.type === 'bug')
    );

  const allTasksDoneForStory = (storyId: string): boolean => {
    const tasks = getTasksForStory(storyId);
    if (tasks.length === 0) return false;
    return tasks.every((t) => t.status === 'done');
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const columnId = result.destination.droppableId.split('::')[0];
    const newStatus = getStatusForTeamColumn(columnId);
    moveWorkItem(result.draggableId, newStatus, columnId);
  };

  const handleMarkStoryDone = (storyId: string) => {
    moveWorkItem(storyId, 'done');
  };

  return (
    <DragDropContext key={boardId} onDragEnd={handleDragEnd}>
      <div
        style={{
          display: 'flex',
          gap: '16px',
          padding: '20px',
          overflowX: 'auto',
          minHeight: '600px',
        }}
      >
        {columns.map((column) => {
          const columnId = column.id;
          return (
            <div
              key={column.id}
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '8px',
                padding: '16px',
                minWidth: '320px',
                width: '320px',
                border: '1px solid #e5e7eb',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '12px',
                }}
              >
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#111827' }}>
                  {column.name}
                </h3>
              </div>
              <div
                style={{
                  width: '100%',
                  height: '4px',
                  backgroundColor: getStatusColor(column.status),
                  borderRadius: '2px',
                  marginBottom: '12px',
                }}
              />
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {features.map((feature) => {
                  const droppableId = `${columnId}::${feature.id}`;
                  const stories = getStoriesForFeature(feature.id);
                  const storyRows: { story: WorkItem; tasks: WorkItem[] }[] = stories.map(
                    (story) => ({
                      story,
                      tasks: getTasksForStory(story.id).filter((t) =>
                        isStatusInTeamColumn(t.status, columnId)
                      ),
                    })
                  );
                  let taskIndex = 0;

                  return (
                    <Droppable key={droppableId} droppableId={droppableId}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          style={{
                            marginBottom: '16px',
                            backgroundColor: snapshot.isDraggingOver ? '#f9fafb' : 'transparent',
                            borderRadius: '6px',
                            padding: '8px',
                            minHeight: '40px',
                          }}
                        >
                          <div
                            style={{
                              fontSize: '12px',
                              fontWeight: '600',
                              color: '#6b7280',
                              textTransform: 'uppercase',
                              marginBottom: '8px',
                              paddingBottom: '4px',
                              borderBottom: '1px solid #e5e7eb',
                            }}
                          >
                            {feature.title}
                          </div>

                          {storyRows.map(({ story, tasks: tasksInColumn }) => {
                            const showFullStoryCard =
                              (columnId === 'backlog' && isBacklogStatus(story.status)) ||
                              (columnId === 'in-progress' && story.status === 'in-progress') ||
                              (columnId === 'done' && story.status === 'done');

                            const showStoryLabel =
                              tasksInColumn.length > 0 && !showFullStoryCard;
                            const showDoneCheckbox =
                              columnId !== 'done' &&
                              showFullStoryCard &&
                              allTasksDoneForStory(story.id);

                            if (
                              !showFullStoryCard &&
                              !showStoryLabel &&
                              tasksInColumn.length === 0
                            ) {
                              return null;
                            }

                            const startIndex = taskIndex;
                            taskIndex = startIndex + tasksInColumn.length;

                            return (
                              <div key={story.id} style={{ marginBottom: '12px' }}>
                                {showFullStoryCard && (
                                  <div style={{ marginBottom: '8px' }}>
                                    <div
                                      style={{
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        gap: '8px',
                                      }}
                                    >
                                      <div style={{ flex: 1 }} onClick={(e) => e.stopPropagation()}>
                                        <div onClick={() => handleOpenItem(story.id)}>
                                          <WorkItemCard item={story} />
                                        </div>
                                      </div>
                                      {showDoneCheckbox && (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleMarkStoryDone(story.id);
                                          }}
                                          title="Mark story done"
                                          style={{
                                            flexShrink: 0,
                                            padding: '6px',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '6px',
                                            backgroundColor: '#ffffff',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                          }}
                                        >
                                          <Check size={18} color="#22c55e" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                )}
                                {showStoryLabel && !showFullStoryCard && (
                                  <div
                                    style={{
                                      fontSize: '12px',
                                      fontWeight: '600',
                                      color: '#374151',
                                      marginBottom: '4px',
                                    }}
                                  >
                                    {story.title}
                                  </div>
                                )}
                                {tasksInColumn.map((task, i) => (
                                    <Draggable
                                      key={task.id}
                                      draggableId={task.id}
                                      index={startIndex + i}
                                    >
                                      {(provided, snapshot) => (
                                        <div
                                          ref={provided.innerRef}
                                          {...provided.draggableProps}
                                          {...provided.dragHandleProps}
                                          style={{
                                            ...provided.draggableProps.style,
                                            opacity: snapshot.isDragging ? 0.8 : 1,
                                            marginBottom: '6px',
                                          }}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleOpenItem(task.id);
                                          }}
                                        >
                                          <WorkItemCard item={task} compact />
                                        </div>
                                      )}
                                    </Draggable>
                                ))}
                              </div>
                            );
                          })}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  );
                })}
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
                  Add Item
                </button>
              )}
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
};

export default TeamKanbanBoard;

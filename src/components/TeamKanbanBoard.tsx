import React from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { useStore } from '../store/useStore';
import { KanbanColumn, WorkItem } from '../types';
import { getStatusColor, getStatusForTeamColumn, isStatusInTeamColumn } from '../utils/boardConfig';
import { compareWorkItemOrder } from '../utils/order';
import WorkItemCard from './WorkItemCard';
import { Check } from 'lucide-react';

const READY_COLUMN_GREEN = '#10b981'; // green when story has task in progress

const BUG_LANE_ID = '__bug__';
const AD_HOC_LANE_ID = '__ad_hoc__';

interface TeamKanbanBoardProps {
  boardId: string;
  columns: KanbanColumn[];
  lanes: { id: string; title: string }[];
  getStoriesForLane: (laneId: string) => WorkItem[];
  onAddItem?: (columnId: string) => void;
  onOpenItem?: (itemId: string) => void;
}

const TeamKanbanBoard: React.FC<TeamKanbanBoardProps> = ({
  boardId,
  columns,
  lanes,
  getStoriesForLane,
  onAddItem,
  onOpenItem,
}) => {
  const { workItems, moveWorkItem, setSelectedWorkItem } = useStore();

  const handleOpenItem = (itemId: string) => {
    setSelectedWorkItem(itemId);
    onOpenItem?.(itemId);
  };

  const getTasksForStory = (storyId: string): WorkItem[] =>
    workItems
      .filter((i) => i.parentId === storyId && (i.type === 'task' || i.type === 'bug'))
      .sort(compareWorkItemOrder);

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
    // When a user story is dragged to Ready, move all its tasks to Ready as well
    const item = workItems.find((i) => i.id === result.draggableId);
    if (item?.type === 'user-story' && columnId === 'to-do' && newStatus === 'to-do') {
      getTasksForStory(result.draggableId).forEach((task) => moveWorkItem(task.id, 'to-do'));
    }
  };

  const handleMarkStoryDone = (storyId: string) => {
    moveWorkItem(storyId, 'done');
  };

  /** User story cards stay in Ready (or Backlog/Done/Archive); never in In Progress column. */
  const isStoryCardInColumn = (story: WorkItem, columnId: string): boolean => {
    if (columnId === 'to-do') return story.status === 'to-do' || story.status === 'in-progress';
    if (columnId === 'done') return story.status === 'done';
    if (columnId === 'archive') return story.status === 'archive';
    if (columnId === 'backlog') return story.status === 'backlog';
    return false; // in-progress column never shows user story cards
  };

  const LANE_LABEL_WIDTH = 280;
  const COLUMN_MIN_WIDTH = 280;

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

        {/* One row per swim lane: lane crosses all columns */}
        {lanes.map((lane, laneIndex) => {
          const isBugLane = lane.id === BUG_LANE_ID;
          const isAdHocLane = lane.id === AD_HOC_LANE_ID;
          const featureItem =
            !isBugLane && !isAdHocLane
              ? workItems.find((i) => i.id === lane.id && i.type === 'feature')
              : undefined;
          const laneItems = getStoriesForLane(lane.id);
          const isEven = laneIndex % 2 === 0;

          // Content-based min height for story lanes so swimlane grows with story + tasks
          let laneMinHeight = 60;
          if (!isBugLane && !isAdHocLane) {
            let maxCardCount = 0;
            for (const column of columns) {
              const colId = column.id;
              let count = 0;
              for (const story of laneItems) {
                const showFullStoryCard = isStoryCardInColumn(story, colId);
                const tasksInColumn = getTasksForStory(story.id).filter((t) =>
                  isStatusInTeamColumn(t.status, colId)
                );
                if (showFullStoryCard) count += 1;
                count += tasksInColumn.length;
                if (!showFullStoryCard && tasksInColumn.length > 0) count += 1;
              }
              maxCardCount = Math.max(maxCardCount, count);
            }
            laneMinHeight = Math.max(60, 24 + maxCardCount * 52);
          }

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
                  alignItems: 'flex-start',
                }}
              >
                {featureItem ? (
                  <div style={{ width: '100%' }}>
                    <WorkItemCard
                      item={featureItem}
                      onClick={() => handleOpenItem(featureItem.id)}
                    />
                  </div>
                ) : (
                  lane.title
                )}
              </div>
              {columns.map((column) => {
                const columnId = column.id;
                const droppableId = `${columnId}::${lane.id}`;

                if (isBugLane) {
                  const bugsInColumn = laneItems.filter((b) =>
                    isStatusInTeamColumn(b.status, columnId)
                  );
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
                            {bugsInColumn.map((bug, index) => (
                              <Draggable key={bug.id} draggableId={bug.id} index={index}>
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
                                      handleOpenItem(bug.id);
                                    }}
                                  >
                                    <WorkItemCard item={bug} compact />
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
                }

                const stories = laneItems;
                const storyRows: { story: WorkItem; tasks: WorkItem[] }[] = stories.map(
                  (story) => ({
                    story,
                    tasks: getTasksForStory(story.id).filter((t) =>
                      isStatusInTeamColumn(t.status, columnId)
                    ),
                  })
                );
                let columnIndex = 0;

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
                          {storyRows.map(({ story, tasks: tasksInColumn }) => {
                            const showFullStoryCard = isStoryCardInColumn(story, columnId);
                            const showStoryLabel =
                              tasksInColumn.length > 0 && !showFullStoryCard;
                            const showDoneCheckbox =
                              columnId !== 'done' &&
                              columnId !== 'archive' &&
                              showFullStoryCard &&
                              allTasksDoneForStory(story.id);
                            const storyHasTaskInProgress =
                              getTasksForStory(story.id).some((t) => t.status === 'in-progress');
                            const readyColumnGreenOverride =
                              columnId === 'to-do' && showFullStoryCard && storyHasTaskInProgress
                                ? READY_COLUMN_GREEN
                                : undefined;

                            if (
                              !showFullStoryCard &&
                              !showStoryLabel &&
                              tasksInColumn.length === 0
                            ) {
                              return null;
                            }

                            const rowStartIndex = columnIndex;
                            if (showFullStoryCard) columnIndex += 1;
                            columnIndex += tasksInColumn.length;

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
                                      <Draggable
                                        key={story.id}
                                        draggableId={story.id}
                                        index={rowStartIndex}
                                      >
                                        {(providedStory, snapshotStory) => (
                                          <div
                                            ref={providedStory.innerRef}
                                            {...providedStory.draggableProps}
                                            {...providedStory.dragHandleProps}
                                            style={{
                                              ...providedStory.draggableProps.style,
                                              flex: 1,
                                              opacity: snapshotStory.isDragging ? 0.8 : 1,
                                            }}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleOpenItem(story.id);
                                            }}
                                          >
                                            <WorkItemCard
                                              item={story}
                                              borderColorOverride={readyColumnGreenOverride}
                                            />
                                          </div>
                                        )}
                                      </Draggable>
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
                                    index={rowStartIndex + (showFullStoryCard ? 1 : 0) + i}
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

export default TeamKanbanBoard;

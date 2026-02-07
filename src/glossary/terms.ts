import type { GlossaryKey } from './glossaryKeys';

export interface GlossaryTerm {
  key: GlossaryKey;
  defaultLabel: string;
  description: string;
  category: 'work_item' | 'event' | 'role' | 'board' | 'other';
}

export const TERMS: GlossaryTerm[] = [
  { key: 'portfolio', defaultLabel: 'Portfolio', description: 'Top-level portfolio', category: 'work_item' },
  { key: 'initiative', defaultLabel: 'Initiative', description: 'Strategic initiative', category: 'work_item' },
  { key: 'product', defaultLabel: 'Product', description: 'Product or value stream', category: 'work_item' },
  { key: 'program', defaultLabel: 'Program', description: 'Program or train', category: 'work_item' },
  { key: 'team', defaultLabel: 'Team', description: 'Team', category: 'work_item' },
  { key: 'feature', defaultLabel: 'Feature', description: 'Feature', category: 'work_item' },
  { key: 'epic', defaultLabel: 'Epic', description: 'Epic', category: 'work_item' },
  { key: 'story', defaultLabel: 'User Story', description: 'User story', category: 'work_item' },
  { key: 'task', defaultLabel: 'Task', description: 'Task', category: 'work_item' },
  { key: 'iteration', defaultLabel: 'Iteration', description: 'Iteration or sprint', category: 'event' },
  { key: 'planning_event', defaultLabel: 'Planning Event', description: 'Planning event', category: 'event' },
  { key: 'demo_review', defaultLabel: 'Review', description: 'Demo or review', category: 'event' },
  { key: 'retro', defaultLabel: 'Retrospective', description: 'Retrospective', category: 'event' },
  { key: 'rte', defaultLabel: 'RTE', description: 'Release Train Engineer / Program Manager', category: 'role' },
  { key: 'po', defaultLabel: 'Product Owner', description: 'Product Owner', category: 'role' },
  { key: 'sm', defaultLabel: 'Scrum Master', description: 'Scrum Master', category: 'role' },
  { key: 'dri', defaultLabel: 'DRI', description: 'Directly Responsible Individual', category: 'role' },
  { key: 'wsjf', defaultLabel: 'WSJF', description: 'Weighted Shortest Job First', category: 'other' },
  { key: 'kanban_board', defaultLabel: 'Kanban Board', description: 'Kanban board', category: 'board' },
  { key: 'planning_board', defaultLabel: 'Planning Board', description: 'Planning board', category: 'board' },
];

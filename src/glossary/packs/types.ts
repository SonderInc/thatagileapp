import type { GlossaryKey } from '../glossaryKeys';

export type FrameworkId = 'default' | 'safe' | 'less' | 'spotify' | 'apple' | 'dad' | 'custom' | 'scrum_at_scale' | 'kanban_scaled';

export interface LabelPack {
  id: FrameworkId;
  name: string;
  labels: Partial<Record<GlossaryKey, string>>;
}

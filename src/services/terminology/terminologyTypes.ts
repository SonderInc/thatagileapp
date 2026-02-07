import type { GlossaryKey } from '../../glossary/glossaryKeys';
import type { FrameworkId } from '../../glossary/packs/types';

export interface TerminologySettings {
  activePackId: FrameworkId;
  overrides: Partial<Record<GlossaryKey, string>>;
}

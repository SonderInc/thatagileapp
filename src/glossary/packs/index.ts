import type { LabelPack } from './types';
import { PACK_DEFAULT } from './default';
import { PACK_SAFE } from './safe';
import { PACK_LESS } from './less';
import { PACK_SPOTIFY } from './spotify';
import { PACK_APPLE } from './apple';
import { PACK_DAD } from './dad';
import { PACK_CUSTOM } from './custom';
import { PACK_SCRUM_AT_SCALE } from './scrumAtScale';
import { PACK_KANBAN_SCALED } from './kanbanScaled';

export const PACKS: LabelPack[] = [
  PACK_DEFAULT,
  PACK_CUSTOM,
  PACK_SAFE,
  PACK_LESS,
  PACK_SPOTIFY,
  PACK_APPLE,
  PACK_DAD,
  PACK_SCRUM_AT_SCALE,
  PACK_KANBAN_SCALED,
];

export { PACK_DEFAULT, PACK_CUSTOM, PACK_SAFE, PACK_LESS, PACK_SPOTIFY, PACK_APPLE, PACK_DAD, PACK_SCRUM_AT_SCALE, PACK_KANBAN_SCALED };
export type { LabelPack, FrameworkId } from './types';

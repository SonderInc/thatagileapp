import type { LabelPack } from './types';
import { PACK_DEFAULT } from './default';
import { PACK_SAFE } from './safe';
import { PACK_LESS } from './less';
import { PACK_SPOTIFY } from './spotify';
import { PACK_APPLE } from './apple';
import { PACK_DAD } from './dad';

export const PACKS: LabelPack[] = [
  PACK_DEFAULT,
  PACK_SAFE,
  PACK_LESS,
  PACK_SPOTIFY,
  PACK_APPLE,
  PACK_DAD,
];

export { PACK_DEFAULT, PACK_SAFE, PACK_LESS, PACK_SPOTIFY, PACK_APPLE, PACK_DAD };
export type { LabelPack, FrameworkId } from './types';

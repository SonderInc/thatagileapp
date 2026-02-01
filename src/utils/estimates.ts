import { EpicFeatureSize } from '../types';

export const SIZE_OPTIONS: { value: EpicFeatureSize; label: string }[] = [
  { value: '?', label: '?' },
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
  { value: 'xlarge', label: 'XLarge' },
  { value: 'xxlarge', label: 'XXLarge' },
];

export const STORY_POINT_OPTIONS: { value: number | null; label: string }[] = [
  { value: null, label: '?' },
  { value: 0, label: '0' },
  { value: 1, label: '1' },
  { value: 2, label: '2' },
  { value: 3, label: '3' },
  { value: 5, label: '5' },
  { value: 8, label: '8' },
  { value: 13, label: '13' },
  { value: 20, label: '20' },
  { value: 40, label: '40' },
  { value: 100, label: '100' },
];

export function getSizeLabel(size: EpicFeatureSize | undefined): string {
  if (!size || size === '?') return '?';
  const opt = SIZE_OPTIONS.find((o) => o.value === size);
  return opt?.label ?? size;
}

export function formatStoryPoints(points: number | null | undefined): string {
  if (points == null) return '?';
  return String(points);
}

export const DAYS_OPTIONS: { value: number | null; label: string }[] = [
  { value: null, label: '?' },
  { value: 0.5, label: '0.5' },
  { value: 1, label: '1' },
  { value: 1.5, label: '1.5' },
  { value: 2, label: '2' },
];

export function formatDays(days: number | null | undefined): string {
  if (days == null) return '?';
  return String(days);
}

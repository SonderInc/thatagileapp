/**
 * Design tokens for consistent styling across the app.
 * Use these in inline styles or when building style objects.
 */

export const colors = {
  textPrimary: '#111827',
  textSecondary: '#6b7280',
  textMuted: '#374151',
  textMutedLight: '#4b5563',
  border: '#d1d5db',
  borderLight: '#e5e7eb',
  background: '#ffffff',
  backgroundMuted: '#f9fafb',
  backgroundOverlay: 'rgba(0, 0, 0, 0.5)',
  primary: '#3b82f6',
  primarySubtle: '#eff6ff',
  danger: '#b91c1c',
  dangerSubtle: '#fef2f2',
  dangerBorder: '#fecaca',
  success: '#22c55e',
  disabled: '#9ca3af',
} as const;

export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '20px',
  xxl: '24px',
} as const;

export const radius = {
  sm: '6px',
  md: '8px',
  lg: '12px',
} as const;

export const typography = {
  fontSizeXs: '12px',
  fontSizeSm: '13px',
  fontSizeBase: '14px',
  fontSizeLg: '15px',
  fontSizeXl: '20px',
  fontSize2xl: '24px',
  fontSize3xl: '32px',
  fontWeightMedium: '500',
  fontWeightSemibold: '600',
  fontWeightBold: '700',
  lineHeightTight: 1.5,
  lineHeightRelaxed: 1.6,
} as const;

export const theme = {
  colors,
  spacing,
  radius,
  typography,
} as const;

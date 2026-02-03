import React from 'react';
import { colors, radius, spacing, typography } from '../styles/theme';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  children: React.ReactNode;
}

const variantStyles = {
  primary: {
    backgroundColor: colors.primary,
    color: colors.background,
    border: 'none',
  },
  secondary: {
    backgroundColor: colors.background,
    color: colors.textMuted,
    border: `1px solid ${colors.border}`,
  },
} as const;

const Button: React.FC<ButtonProps> = ({
  variant = 'secondary',
  children,
  style,
  ...rest
}) => (
  <button
    type="button"
    style={{
      padding: `${spacing.sm} ${spacing.md}`,
      borderRadius: radius.md,
      fontSize: typography.fontSizeBase,
      fontWeight: typography.fontWeightMedium,
      cursor: 'pointer',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      ...variantStyles[variant],
      ...style,
    }}
    {...rest}
  >
    {children}
  </button>
);

export default Button;

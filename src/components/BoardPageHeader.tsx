import React from 'react';
import { spacing, typography, colors } from '../styles/theme';

export interface BoardPageHeaderProps {
  title: string;
  subtitle: string;
  children?: React.ReactNode;
}

const BoardPageHeader: React.FC<BoardPageHeaderProps> = ({ title, subtitle, children }) => (
  <div
    style={{
      marginBottom: spacing.xxl,
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: spacing.lg,
      flexWrap: 'wrap',
    }}
  >
    <div>
      <h1
        style={{
          margin: 0,
          fontSize: typography.fontSize3xl,
          fontWeight: typography.fontWeightBold,
          color: colors.textPrimary,
        }}
      >
        {title}
      </h1>
      <p
        style={{
          margin: `${spacing.sm} 0 0 0`,
          color: colors.textSecondary,
          fontSize: typography.fontSizeBase,
        }}
      >
        {subtitle}
      </p>
    </div>
    {children}
  </div>
);

export default BoardPageHeader;

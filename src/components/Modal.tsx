import React from 'react';
import { X } from 'lucide-react';
import { colors, radius, spacing, typography } from '../styles/theme';

export interface ModalProps {
  title: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  /** Max width of the panel (default '560px'). */
  maxWidth?: string | number;
  /** z-index of the overlay (default 1000). Use higher when stacking modals. */
  zIndex?: number;
}

const Modal: React.FC<ModalProps> = ({
  title,
  onClose,
  children,
  maxWidth = '560px',
  zIndex = 1000,
}) => (
  <div
    style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: colors.backgroundOverlay,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex,
    }}
    onClick={onClose}
  >
    <div
      style={{
        backgroundColor: colors.background,
        borderRadius: radius.lg,
        padding: spacing.xxl,
        width: '90%',
        maxWidth: typeof maxWidth === 'number' ? `${maxWidth}px` : maxWidth,
        maxHeight: '90vh',
        overflow: 'auto',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: spacing.xl,
        }}
      >
        <h2 style={{ margin: 0, fontSize: typography.fontSizeXl, fontWeight: typography.fontWeightSemibold, color: colors.textPrimary }}>
          {title}
        </h2>
        <button
          type="button"
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: spacing.xs,
            display: 'flex',
            alignItems: 'center',
            color: colors.textSecondary,
          }}
          aria-label="Close"
        >
          <X size={24} />
        </button>
      </div>
      {children}
    </div>
  </div>
);

export default Modal;

/**
 * Professional Divider Component
 */

import React from 'react';
import './Divider.css';

interface DividerProps {
  orientation?: 'horizontal' | 'vertical';
  className?: string;
  spacing?: 'none' | 'sm' | 'md' | 'lg';
}

export const Divider: React.FC<DividerProps> = ({
  orientation = 'horizontal',
  className = '',
  spacing = 'md',
}) => {
  return (
    <div
      className={`divider divider-${orientation} divider-spacing-${spacing} ${className}`}
      role="separator"
    />
  );
};

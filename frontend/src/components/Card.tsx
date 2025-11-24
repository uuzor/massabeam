/**
 * Professional Card Component
 */

import React from 'react';
import './Card.css';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  padding = 'md',
  hover = false,
}) => {
  const classes = [
    'card',
    `card-padding-${padding}`,
    hover && 'card-hover',
    className,
  ].filter(Boolean).join(' ');

  return <div className={classes}>{children}</div>;
};

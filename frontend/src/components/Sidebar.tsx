/**
 * Professional Sidebar Component
 */

import React from 'react';
import './Sidebar.css';

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
}

interface SidebarProps {
  items: SidebarItem[];
  activeItem: string;
  onItemClick: (id: string) => void;
  logo?: React.ReactNode;
  footer?: React.ReactNode;
}

export const Sidebar: React.FC<SidebarProps> = ({
  items,
  activeItem,
  onItemClick,
  logo,
  footer,
}) => {
  return (
    <aside className="sidebar">
      {logo && <div className="sidebar-logo">{logo}</div>}

      <nav className="sidebar-nav">
        {items.map((item) => (
          <button
            key={item.id}
            className={`sidebar-item ${activeItem === item.id ? 'sidebar-item-active' : ''}`}
            onClick={() => onItemClick(item.id)}
          >
            <span className="sidebar-item-icon">{item.icon}</span>
            <span className="sidebar-item-label">{item.label}</span>
          </button>
        ))}
      </nav>

      {footer && <div className="sidebar-footer">{footer}</div>}
    </aside>
  );
};

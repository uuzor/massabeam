import React, { useState } from 'react';
import { Zap, LogOut, ChevronDown } from 'lucide-react';
import { useWallet } from '../hooks/useWallet';
import '../styles/Navbar.css';

interface NavbarProps {
  activePage: string;
  setActivePage: (page: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activePage, setActivePage }) => {
  const { isConnected, userAddress, connect, disconnect, loading } = useWallet();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const formatAddress = (addr: string) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const navItems = [
    { id: 'mint', label: 'Mint', active: activePage === 'mint' },
    { id: 'swap', label: 'Swap', active: activePage === 'swap' },
    { id: 'pools', label: 'Pools', active: activePage === 'pools' },
    { id: 'liquidity', label: 'Liquidity', active: activePage === 'liquidity' },
    { id: 'limit-order', label: 'Limit Order', active: activePage === 'limit-order' },
    { id: 'recurring-order', label: 'DCA', active: activePage === 'recurring-order' },
    { id: 'grid-order', label: 'Grid', active: activePage === 'grid-order' },
    { id: 'orders', label: 'Orders', active: activePage === 'orders' },
  ];

  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* Logo */}
        <div className="navbar-brand">
          <Zap size={24} />
          <span>Massa DeFi</span>
        </div>

        {/* Navigation Links - Only show if connected */}
        {isConnected && (
          <div className="navbar-links">
            {navItems.map((item) => (
              <button
                key={item.id}
                className={`nav-link ${item.active ? 'active' : ''}`}
                onClick={() => setActivePage(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}

        {/* Wallet Section */}
        <div className="navbar-wallet">
          {isConnected ? (
            <div className="wallet-connected">
              <div className="wallet-address-display">
                <div className="wallet-status">
                  <span className="status-indicator"></span>
                  <span className="status-label">Connected</span>
                </div>
                <div
                  className="wallet-address"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                >
                  <span className="address-text">{formatAddress(userAddress)}</span>
                  <ChevronDown size={16} />
                </div>
              </div>

              {/* User Menu Dropdown */}
              {showUserMenu && (
                <div className="user-menu-dropdown">
                  <div className="menu-item user-info">
                    <div className="full-address">
                      <span className="label">Address:</span>
                      <span className="value">{userAddress}</span>
                    </div>
                  </div>
                  <div className="menu-divider"></div>
                  <button
                    className="menu-item logout-btn"
                    onClick={() => {
                      disconnect();
                      setShowUserMenu(false);
                      setActivePage('landing');
                    }}
                  >
                    <LogOut size={16} />
                    Disconnect
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              className="btn-connect"
              onClick={connect}
              disabled={loading}
            >
              {loading ? 'Connecting...' : 'Connect Wallet'}
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};

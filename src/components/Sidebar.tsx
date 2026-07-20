'use client';

import React from 'react';
import { Users, Calendar, PhoneCall, GitBranch, BarChart3, Mail, Settings, LogOut, X, Info } from 'lucide-react';

interface SidebarProps {
  isDemoMode: boolean;
  onOpenSettings?: () => void;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export default function Sidebar({
  isDemoMode,
  onOpenSettings,
  activeTab,
  onSelectTab,
  isMobileOpen,
  onCloseMobile
}: SidebarProps) {
  
  // Navigation Items with tab identifiers
  const mainNav = [
    { name: 'Overview', icon: BarChart3, tab: 'overview' },
    { name: 'Leads', icon: Users, tab: 'leads' },
    { name: 'Meetings', icon: Calendar, tab: 'meetings' },
    { name: 'Call Logs', icon: PhoneCall, tab: 'calls' },
    { name: 'Inquiries', icon: Info, tab: 'inquiries' },
    { name: 'Pipeline', icon: GitBranch, tab: 'pipeline' },
  ];

  const insightNav = [
    { name: 'Analytics', icon: BarChart3, tab: 'analytics' },
    { name: 'Email Activity', icon: Mail, tab: 'email' },
  ];

  return (
    <aside 
      className={`sidebar-container ${isMobileOpen ? 'mobile-open' : ''}`}
      style={{
        width: '248px',
        flexShrink: 0,
        background: '#FFFFFF',
        borderRight: '1px solid #EBECEF',
        display: 'flex',
        flexDirection: 'column',
        position: 'sticky',
        top: 0,
        height: '100vh',
      }}
    >
      {/* Brand Header */}
      <div style={{
        padding: '22px 22px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
      }}>
        <img
          src="/morango_logo.jpg"
          alt="Morango AI"
          style={{
            width: '34px',
            height: '34px',
            borderRadius: '9px',
            objectFit: 'cover',
          }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
          <span style={{
            fontSize: '16px',
            fontWeight: 800,
            letterSpacing: '-0.3px',
            color: '#16191D',
          }}>
            Morango<span style={{ color: '#E8483D' }}>Ai</span>
          </span>
          <span style={{
            fontSize: '11px',
            color: '#9AA1AD',
            fontWeight: 600,
          }}>
            CRM Workspace
          </span>
        </div>
        
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="mobile-sidebar-close"
            style={{
              display: 'none',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              marginLeft: 'auto',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} color="#9AA1AD" />
          </button>
        )}
      </div>

      {/* Navigation Groups */}
      <nav style={{
        padding: '8px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '3px',
      }}>
        {/* MAIN SECTION */}
        <span style={{
          fontSize: '10.5px',
          fontWeight: 700,
          color: '#AEB4BE',
          letterSpacing: '0.6px',
          padding: '10px 12px 4px',
          textTransform: 'uppercase',
        }}>
          MAIN
        </span>

        {mainNav.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.tab;
          return (
            <button
              key={item.name}
              onClick={() => onSelectTab(item.tab)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '11px',
                padding: '9px 12px',
                borderRadius: '10px',
                fontSize: '13.5px',
                fontWeight: 600,
                color: isActive ? '#E8483D' : '#5A616E',
                background: isActive ? '#FDEBE9' : 'transparent',
                transition: 'var(--transition-smooth)',
                border: 'none',
                cursor: 'pointer',
                width: '100%',
                textAlign: 'left',
              }}
              className={isActive ? '' : 'hover-nav'}
            >
              <Icon size={17} color={isActive ? '#E8483D' : '#9AA1AD'} />
              {item.name}
            </button>
          );
        })}

        {/* INSIGHTS SECTION */}
        <span style={{
          fontSize: '10.5px',
          fontWeight: 700,
          color: '#AEB4BE',
          letterSpacing: '0.6px',
          padding: '14px 12px 4px',
          textTransform: 'uppercase',
        }}>
          INSIGHTS
        </span>

        {insightNav.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.tab;
          return (
            <button
              key={item.name}
              onClick={() => onSelectTab(item.tab)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '11px',
                padding: '9px 12px',
                borderRadius: '10px',
                fontSize: '13.5px',
                fontWeight: 600,
                color: isActive ? '#E8483D' : '#5A616E',
                background: isActive ? '#FDEBE9' : 'transparent',
                transition: 'var(--transition-smooth)',
                border: 'none',
                cursor: 'pointer',
                width: '100%',
                textAlign: 'left',
              }}
              className={isActive ? '' : 'hover-nav'}
            >
              <Icon size={17} color={isActive ? '#E8483D' : '#9AA1AD'} />
              {item.name}
            </button>
          );
        })}
      </nav>

      {/* Settings & Log Out */}
      <div className="sidebar-bottom-actions" style={{ padding: '0 16px', marginTop: 'auto', marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <button
          onClick={() => onSelectTab('settings')}
          className="sidebar-bottom-btn"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 14px',
            borderRadius: '10px',
            border: '1px solid #EBECEF',
            background: activeTab === 'settings' ? '#FDEBE9' : '#FFFFFF',
            color: activeTab === 'settings' ? '#E8483D' : '#5A616E',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            width: '100%',
            justifyContent: 'center',
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
            transition: 'var(--transition-smooth)',
          }}
          onMouseEnter={(e) => {
            if (activeTab !== 'settings') {
              e.currentTarget.style.background = '#FAFBFC';
              e.currentTarget.style.borderColor = '#9AA1AD';
            }
          }}
          onMouseLeave={(e) => {
            if (activeTab !== 'settings') {
              e.currentTarget.style.background = '#FFFFFF';
              e.currentTarget.style.borderColor = '#EBECEF';
            }
          }}
        >
          <Settings size={15} color={activeTab === 'settings' ? '#E8483D' : '#9AA1AD'} />
          Settings
        </button>

        <button
          onClick={async () => {
            try {
              await fetch('/api/auth/logout', { method: 'POST' });
              window.location.href = '/login';
            } catch (err) {
              console.error('Logout error:', err);
            }
          }}
          className="sidebar-bottom-btn"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 14px',
            borderRadius: '10px',
            border: '1px solid #FEE2E2',
            background: '#FFF5F5',
            color: '#DC2626',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            width: '100%',
            justifyContent: 'center',
            transition: 'var(--transition-smooth)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#FEE2E2';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#FFF5F5';
          }}
        >
          <LogOut size={15} color="#DC2626" />
          Log Out
        </button>
      </div>

      <style jsx global>{`
        @media (max-width: 768px) {
          .sidebar-bottom-actions {
            position: sticky !important;
            bottom: 0 !important;
            background: #fff !important;
            border-top: 1px solid #EBECEF !important;
            padding: 12px 16px calc(16px + env(safe-area-inset-bottom)) !important;
            margin: 0 !important;
            gap: 8px !important;
          }
          .sidebar-bottom-btn {
            padding: 14px 16px !important;
            font-size: 15px !important;
            border-radius: 12px !important;
            min-height: 50px !important;
          }
        }
      `}</style>
    </aside>
  );
}

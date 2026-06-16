'use client';

import React from 'react';
import { Users, Calendar, PhoneCall, GitBranch, BarChart3, Mail, Settings, LogOut } from 'lucide-react';

interface SidebarProps {
  isDemoMode: boolean;
  onOpenSettings?: () => void;
  activeTab: string;
  onSelectTab: (tab: string) => void;
}

export default function Sidebar({ isDemoMode, onOpenSettings, activeTab, onSelectTab }: SidebarProps) {
  
  // Navigation Items with tab identifiers
  const mainNav = [
    { name: 'Overview', icon: BarChart3, tab: 'overview' },
    { name: 'Leads', icon: Users, tab: 'leads' },
    { name: 'Meetings', icon: Calendar, tab: 'meetings' },
    { name: 'Call Logs', icon: PhoneCall, tab: 'calls' },
    { name: 'Pipeline', icon: GitBranch, tab: 'pipeline' },
  ];

  const insightNav = [
    { name: 'Analytics', icon: BarChart3, tab: 'analytics' },
    { name: 'Email Activity', icon: Mail, tab: 'email' },
  ];

  return (
    <aside style={{
      width: '248px',
      flexShrink: 0,
      background: '#FFFFFF',
      borderRight: '1px solid #EBECEF',
      display: 'flex',
      flexDirection: 'column',
      position: 'sticky',
      top: 0,
      height: '100vh',
    }}>
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

      {/* Database Connection Config Link */}
      <div style={{ padding: '0 24px', marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 10px',
              borderRadius: '8px',
              border: '1px solid #EBECEF',
              background: '#FFFFFF',
              color: '#5A616E',
              fontSize: '11.5px',
              fontWeight: 600,
              cursor: 'pointer',
              width: '100%',
              justifyContent: 'center',
              boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
              transition: 'var(--transition-smooth)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#FAFBFC';
              e.currentTarget.style.borderColor = '#9AA1AD';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#FFFFFF';
              e.currentTarget.style.borderColor = '#EBECEF';
            }}
          >
            <Settings size={13} color="#9AA1AD" />
            Settings
          </button>
        )}

        <button
          onClick={async () => {
            try {
              await fetch('/api/auth/logout', { method: 'POST' });
              window.location.href = '/login';
            } catch (err) {
              console.error('Logout error:', err);
            }
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 10px',
            borderRadius: '8px',
            border: '1px solid #FEE2E2',
            background: '#FFF5F5',
            color: '#DC2626',
            fontSize: '11.5px',
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
          <LogOut size={13} color="#DC2626" />
          Log Out
        </button>
      </div>

      {/* Bottom Status Card */}
      <div style={{
        marginTop: 'auto',
        padding: '14px',
      }}>
        <div style={{
          background: 'linear-gradient(135deg,#FDEBE9,#FBE3DE)',
          border: '1px solid #F6D5CF',
          borderRadius: '14px',
          padding: '14px',
        }}>
          {/* Vapi Live Status */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '6px',
          }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#16A34A',
              boxShadow: '0 0 0 3px #DCFCE7',
            }}></span>
            <span style={{
              fontSize: '12px',
              fontWeight: 700,
              color: '#16191D',
            }}>
              Vapi Agent Live
            </span>
          </div>
          <p style={{
            margin: '0 0 10px 0',
            fontSize: '11px',
            color: '#7A5650',
            lineHeight: 1.45,
            fontWeight: 500,
          }}>
            Calls auto-sync to CRM. n8n is delivering follow-up emails.
          </p>

          {/* Database Connection Node */}
          <div style={{
            borderTop: '1px solid rgba(232, 72, 61, 0.15)',
            paddingTop: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '10px',
            fontWeight: 700,
            color: isDemoMode ? '#D97706' : '#16A34A',
          }}>
            <span style={{
              width: '5px',
              height: '5px',
              borderRadius: '50%',
              background: isDemoMode ? '#D97706' : '#16A34A',
            }} />
            {isDemoMode ? 'CRM: LOCAL DEMO' : 'CRM: SUPABASE DB'}
          </div>
        </div>
      </div>
    </aside>
  );
}

'use client';

import React, { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import KanbanBoard from '@/components/KanbanBoard';
import LeadDetailModal from '@/components/LeadDetailModal';
import NewLeadModal from '@/components/NewLeadModal';
import OverviewView from '@/components/OverviewView';
import LeadsView from '@/components/LeadsView';
import MeetingsView from '@/components/MeetingsView';
import CallsView from '@/components/CallsView';
import AnalyticsView from '@/components/AnalyticsView';
import EmailView from '@/components/EmailView';
import SettingsView from '@/components/SettingsView';
import { dbService, Lead } from '@/lib/db';
import { Database, X, RefreshCw, Menu, Bell } from 'lucide-react';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<string>('overview'); // Default Landing Tab
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isNewLeadOpen, setIsNewLeadOpen] = useState(false);
  const [newLeadDefaultStatus, setNewLeadDefaultStatus] = useState<Lead['status']>('New Lead');
  const [isDemoMode, setIsDemoMode] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<{ id: string; username: string; name?: string } | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>([]);

  // Settings state (inputs)
  const [dbUrl, setDbUrl] = useState('');
  const [dbAnonKey, setDbAnonKey] = useState('');

  // Fetch leads on mount
  const fetchLeads = async () => {
    setIsLoading(true);
    try {
      const data = await dbService.getLeads();
      setLeads(data);
      setIsDemoMode(dbService.isDemoMode);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSession = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data);
      }
    } catch (err) {
      console.error('Session load error:', err);
    }
  };

  useEffect(() => {
    fetchLeads();
    fetchSession();
    
    // Load client credentials if present
    if (typeof window !== 'undefined') {
      const storedUrl = localStorage.getItem('supabase_client_url') || '';
      const storedKey = localStorage.getItem('supabase_client_anon_key') || '';
      setDbUrl(storedUrl);
      setDbAnonKey(storedKey);

      // Load read notifications
      const storedNotifs = localStorage.getItem('crm_read_notifications');
      if (storedNotifs) {
        try {
          setReadNotificationIds(JSON.parse(storedNotifs));
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, []);

  // Filter leads on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredLeads(leads);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = leads.filter((lead) => {
      return (
        lead.name.toLowerCase().includes(query) ||
        (lead.email && lead.email.toLowerCase().includes(query)) ||
        (lead.phone && lead.phone.includes(query)) ||
        (lead.company && lead.company.toLowerCase().includes(query)) ||
        lead.service.toLowerCase().includes(query) ||
        lead.status.toLowerCase().includes(query)
      );
    });
    setFilteredLeads(filtered);
  }, [searchQuery, leads]);

  // Handle lead status move (drag & drop)
  const handleMoveLead = async (leadId: string, targetStatus: Lead['status']) => {
    // Optimistic update
    setLeads((prevLeads) =>
      prevLeads.map((lead) =>
        lead.id === leadId ? { ...lead, status: targetStatus } : lead
      )
    );

    // Update selected lead state if it is currently open in detail modal
    if (selectedLead && selectedLead.id === leadId) {
      setSelectedLead((prev) => prev ? { ...prev, status: targetStatus } : null);
    }

    try {
      const success = await dbService.updateLeadStatus(leadId, targetStatus);
      if (!success) {
        fetchLeads();
      }
    } catch (err) {
      console.error(err);
      fetchLeads();
    }
  };

  // Handle lead select
  const handleSelectLead = (lead: Lead) => {
    setSelectedLead(lead);
  };

  // Add Note
  const handleAddNote = async (noteText: string) => {
    if (!selectedLead) return;
    try {
      const newNote = await dbService.addNote(selectedLead.id, noteText);
      const updatedLead = {
        ...selectedLead,
        notes: [newNote, ...(selectedLead.notes || [])]
      };
      setSelectedLead(updatedLead);
      setLeads((prev) => prev.map((l) => (l.id === selectedLead.id ? updatedLead : l)));
    } catch (err) {
      console.error(err);
    }
  };

  // Add Meeting
  const handleAddMeeting = async (date: string, link?: string) => {
    if (!selectedLead) return;
    try {
      const newMeeting = await dbService.addMeeting(selectedLead.id, date, link);
      const updatedLead = {
        ...selectedLead,
        meetings: [...(selectedLead.meetings || []), newMeeting]
      };
      setSelectedLead(updatedLead);
      setLeads((prev) => prev.map((l) => (l.id === selectedLead.id ? updatedLead : l)));
    } catch (err) {
      console.error(err);
    }
  };

  // Delete Lead
  const handleDeleteLead = async (leadId: string) => {
    try {
      const success = await dbService.deleteLead(leadId);
      if (success) {
        setLeads((prev) => prev.filter((l) => l.id !== leadId));
        setSelectedLead(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Create Lead Manually
  const handleCreateLead = async (
    leadData: Omit<Lead, 'id' | 'created_at' | 'meetings' | 'notes'>,
    meetingDate?: string
  ) => {
    try {
      const newLead = await dbService.createLead(leadData);
      
      let createdMeeting = null;
      if (meetingDate) {
        createdMeeting = await dbService.addMeeting(newLead.id, meetingDate);
      }

      const fullLead = {
        ...newLead,
        meetings: createdMeeting ? [createdMeeting] : [],
        notes: []
      };

      setLeads((prev) => [fullLead, ...prev]);
    } catch (err) {
      console.error(err);
    }
  };


  // Tab Header Details
  const getHeaderDetails = () => {
    switch (activeTab) {
      case 'overview':
        return { title: 'Overview', sub: 'Workspace statistics and recent logs' };
      case 'leads':
        return { title: 'Leads Directory', sub: 'Full list of clients and opportunities' };
      case 'meetings':
        return { title: 'Meetings & Appointments', sub: 'List of upcoming calendar events' };
      case 'calls':
        return { title: 'Call Recording Logs', sub: 'Voice recordings and transcripts' };
      case 'analytics':
        return { title: 'Analytics Insights', sub: 'Call conversion metrics and charts' };
      case 'email':
        return { title: 'Email Activity Tracker', sub: 'Automated workflow notification logs' };
      case 'settings':
        return { title: 'Settings', sub: 'Configure database connection and manage active user accounts' };
      case 'pipeline':
      default:
        return { title: 'Lead Pipeline', sub: 'Manage clients gathered from Vapi call bots' };
    }
  };

  const { title: pageTitle, sub: pageSub } = getHeaderDetails();

  interface NotificationItem {
    id: string;
    leadId: string;
    title: string;
    description: string;
    time: string;
    type: 'new_lead' | 'meeting_soon';
    lead: Lead;
  }

  const getNotifications = (): NotificationItem[] => {
    const list: NotificationItem[] = [];
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    (leads || []).forEach((lead) => {
      // 1. New Lead notification (created in last 24h)
      const createdTime = new Date(lead.created_at);
      const leadNotifId = `new-${lead.id}`;
      if (createdTime >= oneDayAgo && lead.status === 'New Lead') {
        if (!readNotificationIds.includes(leadNotifId)) {
          list.push({
            id: leadNotifId,
            leadId: lead.id,
            title: 'New Lead Captured',
            description: `${lead.name} (${lead.service}) from ${lead.source}`,
            time: createdTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            type: 'new_lead',
            lead: lead
          });
        }
      }

      // 2. Upcoming Meeting notification (starting in next 24h)
      if (lead.meetings) {
        lead.meetings.forEach((meeting) => {
          if (meeting.status === 'Scheduled') {
            const meetingTime = new Date(meeting.meeting_date);
            const timeDiffMs = meetingTime.getTime() - now.getTime();
            const timeDiffMins = timeDiffMs / (60 * 1000);
            const meetNotifId = `meet-${meeting.id}`;

            // Starting in the next 24 hours
            if (timeDiffMins > 0 && timeDiffMins <= 1440) {
              if (!readNotificationIds.includes(meetNotifId)) {
                list.push({
                  id: meetNotifId,
                  leadId: lead.id,
                  title: 'Upcoming Meeting',
                  description: `Meeting with ${lead.name} starting in ${
                    timeDiffMins >= 60 ? Math.round(timeDiffMins / 60) + 'h' : Math.round(timeDiffMins) + 'm'
                  }`,
                  time: meetingTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  type: 'meeting_soon',
                  lead: lead
                });
              }
            }
          }
        });
      }
    });

    // Sort: upcoming meetings first, then new leads
    return list.sort((a, b) => {
      if (a.type === 'meeting_soon' && b.type !== 'meeting_soon') return -1;
      if (a.type !== 'meeting_soon' && b.type === 'meeting_soon') return 1;
      return 0;
    });
  };

  const handleMarkAsRead = (id: string) => {
    setReadNotificationIds(prev => {
      const next = [...prev, id];
      localStorage.setItem('crm_read_notifications', JSON.stringify(next));
      return next;
    });
  };

  const handleMarkAllAsRead = () => {
    const activeIds = getNotifications().map(n => n.id);
    setReadNotificationIds(prev => {
      const next = Array.from(new Set([...prev, ...activeIds]));
      localStorage.setItem('crm_read_notifications', JSON.stringify(next));
      return next;
    });
  };

  const notifications = getNotifications();

  return (
    <div className="page-container" style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      
      {/* Sidebar Mobile Overlay Backdrop */}
      {isMobileSidebarOpen && (
        <div 
          className="sidebar-overlay"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar navigation */}
      <Sidebar 
        isDemoMode={isDemoMode} 
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          setIsMobileSidebarOpen(false); // Close drawer on selection
        }}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Dashboard Panel */}
      <main style={{
        flexGrow: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        overflow: 'hidden'
      }}>
        
        {/* Topbar Header */}
        <header style={{
          height: '68px',
          flexShrink: 0,
          background: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(8px)',
          borderBottom: '1px solid #EBECEF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 28px',
          position: 'sticky',
          top: 0,
          zIndex: 5,
        }}>
          {/* Header Title with Mobile Toggler */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="mobile-menu-toggle"
              style={{
                display: 'none',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '4px',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Menu size={20} color="#16191D" />
            </button>
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
              <h1 style={{ margin: 0, fontSize: '19px', fontWeight: 800, color: '#16191D', letterSpacing: '-0.4px' }}>
                {pageTitle}
              </h1>
              <span className="desktop-sub-header" style={{ fontSize: '12.5px', color: '#9AA1AD', fontWeight: 500 }}>
                {pageSub}
              </span>
            </div>
          </div>

          {/* Search, Action & Profile controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            
            {/* Refresh leads list */}
            <button
              onClick={fetchLeads}
              style={{
                position: 'relative',
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                border: '1px solid #EBECEF',
                background: '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'var(--transition-smooth)',
              }}
              title="Refresh Leads"
              disabled={isLoading}
              className="hover-btn"
            >
              <RefreshCw size={15} color="#5A616E" className={isLoading ? 'spinning' : ''} />
            </button>

            {/* Notification Bell Dropdown */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  border: '1px solid #EBECEF',
                  background: '#fff',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'var(--transition-smooth)',
                  position: 'relative'
                }}
                className="hover-btn"
                title="Notifications"
              >
                <Bell size={16} color="#5A616E" />
                {notifications.length > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-4px',
                    background: '#E8483D',
                    color: '#FFF',
                    fontSize: '9.5px',
                    fontWeight: 800,
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid #FFF',
                    boxShadow: '0 2px 4px rgba(232, 72, 61, 0.2)'
                  }}>
                    {notifications.length}
                  </span>
                )}
              </button>

              {isNotificationsOpen && (
                <div style={{
                  position: 'absolute',
                  top: '46px',
                  right: 0,
                  width: '300px',
                  background: '#FFFFFF',
                  border: '1px solid #EBECEF',
                  borderRadius: '12px',
                  boxShadow: '0 10px 25px rgba(22, 25, 29, 0.08)',
                  zIndex: 100,
                  padding: '8px 0',
                  animation: 'fadeUp 0.2s ease'
                }}>
                  <div style={{
                    padding: '8px 16px 12px',
                    borderBottom: '1px solid #F1F2F4',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: '#16191D' }}>Notifications</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {notifications.length > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkAllAsRead();
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#E8483D',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            transition: 'background 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#FDEBE9'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          Clear all
                        </button>
                      )}
                      <span style={{ fontSize: '11px', color: '#E8483D', fontWeight: 700, background: '#FDEBE9', padding: '2px 8px', borderRadius: '8px' }}>
                        {notifications.length} Active
                      </span>
                    </div>
                  </div>

                  <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
                    {notifications.length === 0 ? (
                      <div style={{ padding: '24px 16px', textAlign: 'center', color: '#9AA1AD', fontSize: '12px' }}>
                        No new notifications
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => {
                            handleMarkAsRead(n.id);
                            setSelectedLead(n.lead);
                            setIsNotificationsOpen(false);
                          }}
                          style={{
                            padding: '12px 16px',
                            borderBottom: '1px solid #FAFBFC',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '3px',
                            transition: 'var(--transition-smooth)'
                          }}
                          className="hover-row"
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: n.type === 'meeting_soon' ? '#E8483D' : '#2563EB' }}>
                              {n.title}
                            </span>
                            <span style={{ fontSize: '10px', color: '#9AA1AD', fontWeight: 500 }}>{n.time}</span>
                          </div>
                          <p style={{ margin: 0, fontSize: '11.5px', color: '#5A616E', lineHeight: 1.4, fontWeight: 500 }}>
                            {n.description}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile widget */}
            <div className="header-profile-widget" style={{ display: 'flex', alignItems: 'center', gap: '9px', paddingLeft: '6px', borderLeft: '1px solid #EBECEF' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg,#E8483D,#F5836B)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '13px',
              }}>
                {currentUser?.name 
                  ? currentUser.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
                  : currentUser?.username?.slice(0, 2).toUpperCase() || 'AD'}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#16191D' }}>
                  {currentUser?.name || currentUser?.username || 'Administrator'}
                </span>
                <span style={{ fontSize: '11px', color: '#9AA1AD', fontWeight: 500 }}>Admin</span>
              </div>
            </div>

          </div>
        </header>

        {/* Content Workspace */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '26px 28px 40px',
        }}>
          {isLoading ? (
            <div style={{
              height: '80%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px'
            }}>
              <RefreshCw size={32} className="spinning" color="#E8483D" />
              <p style={{ fontSize: '0.9rem', color: '#9AA1AD' }}>Loading workspace details...</p>
            </div>
          ) : (
            <div style={{ height: '100%' }}>
              {activeTab === 'overview' && (
                <OverviewView 
                  leads={filteredLeads}
                  onSelectLead={handleSelectLead}
                  onNavigateToTab={setActiveTab}
                />
              )}
              {activeTab === 'leads' && (
                <LeadsView 
                  leads={filteredLeads}
                  onSelectLead={handleSelectLead}
                  onAddLeadClick={(status) => {
                    setNewLeadDefaultStatus(status);
                    setIsNewLeadOpen(true);
                  }}
                />
              )}
              {activeTab === 'meetings' && (
                <MeetingsView 
                  leads={filteredLeads}
                  onSelectLead={handleSelectLead}
                />
              )}
              {activeTab === 'calls' && (
                <CallsView 
                  leads={filteredLeads}
                  onSelectLead={handleSelectLead}
                />
              )}
              {activeTab === 'analytics' && (
                <AnalyticsView 
                  leads={filteredLeads}
                />
              )}
              {activeTab === 'email' && (
                <EmailView leads={filteredLeads} />
              )}
              {activeTab === 'settings' && (
                <SettingsView 
                  isDemoMode={isDemoMode}
                  dbUrlInitial={dbUrl}
                  dbAnonKeyInitial={dbAnonKey}
                  onSaveDbSettings={(url, key) => {
                    localStorage.setItem('supabase_client_url', url);
                    localStorage.setItem('supabase_client_anon_key', key);
                    alert('Database credentials saved! Reloading to apply connection settings.');
                    window.location.reload();
                  }}
                  onClearDbSettings={() => {
                    localStorage.removeItem('supabase_client_url');
                    localStorage.removeItem('supabase_client_anon_key');
                    alert('Cleared credentials! CRM will run in Mock/Demo mode.');
                    window.location.reload();
                  }}
                  onProfileUpdate={fetchSession}
                />
              )}
              {activeTab === 'pipeline' && (
                <div style={{ animation: 'fadeUp 0.3s ease', height: '100%' }}>
                  <KanbanBoard
                    leads={filteredLeads}
                    onSelectLead={handleSelectLead}
                    onMoveLead={handleMoveLead}
                    onAddLeadClick={(status) => {
                      setNewLeadDefaultStatus(status);
                      setIsNewLeadOpen(true);
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Modal: Lead Details View */}
      {selectedLead && (
        <LeadDetailModal
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onStatusChange={(status) => handleMoveLead(selectedLead.id, status)}
          onAddNote={handleAddNote}
          onAddMeeting={handleAddMeeting}
          onDeleteLead={handleDeleteLead}
        />
      )}

      {/* Modal: Add Lead Form */}
      {isNewLeadOpen && (
        <NewLeadModal
          onClose={() => setIsNewLeadOpen(false)}
          onSubmit={handleCreateLead}
          defaultStatus={newLeadDefaultStatus}
        />
      )}


    </div>
  );
}

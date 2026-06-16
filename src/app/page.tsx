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
import { dbService, Lead } from '@/lib/db';
import { Search, Plus, Database, X, RefreshCw } from 'lucide-react';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<string>('pipeline'); // Baseline shows Pipeline
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isNewLeadOpen, setIsNewLeadOpen] = useState(false);
  const [newLeadDefaultStatus, setNewLeadDefaultStatus] = useState<Lead['status']>('New Lead');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  // Settings state (inputs)
  const [dbUrl, setDbUrl] = useState('');
  const [dbAnonKey, setDbAnonKey] = useState('');

  // Settings Tabs & User Management State
  const [settingsTab, setSettingsTab] = useState<'database' | 'users'>('database');
  const [users, setUsers] = useState<{ id: string; username: string; created_at: string }[]>([]);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [userError, setUserError] = useState('');
  const [userSuccess, setUserSuccess] = useState('');
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/auth/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  };

  useEffect(() => {
    if (isSettingsOpen && settingsTab === 'users') {
      fetchUsers();
    }
  }, [isSettingsOpen, settingsTab]);

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

  useEffect(() => {
    fetchLeads();
    
    // Load client credentials if present
    if (typeof window !== 'undefined') {
      const storedUrl = localStorage.getItem('supabase_client_url') || '';
      const storedKey = localStorage.getItem('supabase_client_anon_key') || '';
      setDbUrl(storedUrl);
      setDbAnonKey(storedKey);
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

  // Save Settings
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof window !== 'undefined') {
      localStorage.setItem('supabase_client_url', dbUrl);
      localStorage.setItem('supabase_client_anon_key', dbAnonKey);
      
      alert('Credentials saved! Please reload the page to apply connection settings.');
      setIsSettingsOpen(false);
      window.location.reload();
    }
  };

  // Create Operator/User Account
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword.trim()) {
      setUserError('Username and password are required.');
      return;
    }
    if (newPassword.length < 6) {
      setUserError('Password must be at least 6 characters.');
      return;
    }
    
    setIsCreatingUser(true);
    setUserError('');
    setUserSuccess('');

    try {
      const res = await fetch('/api/auth/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: newUsername, password: newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setUserError(data.error || 'Failed to create user.');
      } else {
        setUserSuccess('User registered successfully!');
        setNewUsername('');
        setNewPassword('');
        fetchUsers(); // Refresh users list
      }
    } catch (err) {
      console.error(err);
      setUserError('An error occurred. Please try again.');
    } finally {
      setIsCreatingUser(false);
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
      case 'pipeline':
      default:
        return { title: 'Lead Pipeline', sub: 'Manage clients gathered from Vapi call bots' };
    }
  };

  const { title: pageTitle, sub: pageSub } = getHeaderDetails();

  return (
    <div className="page-container" style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      
      {/* Sidebar navigation */}
      <Sidebar 
        isDemoMode={isDemoMode} 
        onOpenSettings={() => setIsSettingsOpen(true)}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
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
          {/* Header Title */}
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
            <h1 style={{ margin: 0, fontSize: '19px', fontWeight: 800, color: '#16191D', letterSpacing: '-0.4px' }}>
              {pageTitle}
            </h1>
            <span style={{ fontSize: '12.5px', color: '#9AA1AD', fontWeight: 500 }}>
              {pageSub}
            </span>
          </div>

          {/* Search, Action & Profile controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            
            {/* Search Input wrapper */}
            <div style={{ position: 'relative', width: '240px' }}>
              <Search size={15} color="#9AA1AD" style={{ position: 'absolute', left: '12px', top: '12px' }} />
              <input
                type="text"
                placeholder="Search leads, calls…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  paddingLeft: '38px',
                  borderRadius: '10px',
                  height: '38px',
                  background: '#F1F2F4',
                  borderColor: '#EBECEF',
                  fontSize: '13px',
                }}
              />
            </div>

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

            {/* New Lead Manual Button */}
            <button
              onClick={() => {
                setNewLeadDefaultStatus('New Lead');
                setIsNewLeadOpen(true);
              }}
              className="btn btn-primary"
              style={{ height: '38px', borderRadius: '10px', fontSize: '13px', padding: '0 16px' }}
            >
              <Plus size={15} /> New Lead
            </button>

            {/* Profile widget */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '9px', paddingLeft: '6px', borderLeft: '1px solid #EBECEF' }}>
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
                AK
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#16191D' }}>Areeba K.</span>
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
                <EmailView />
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

      {/* Modal: Database Settings configuration */}
      {isSettingsOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(5, 5, 8, 0.4)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '24px'
        }}>
          <div 
            className="glass-panel" 
            style={{
              width: '100%',
              maxWidth: '500px',
              padding: '24px',
              border: '1px solid #EBECEF',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.08)',
              animation: 'fadeUp 0.3s ease forwards',
              background: '#FFFFFF',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Database size={18} color="#E8483D" />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#16191D' }}>Workspace Settings</h3>
              </div>
              <button
                onClick={() => {
                  setIsSettingsOpen(false);
                  setUserError('');
                  setUserSuccess('');
                }}
                style={{
                  background: '#FAFBFC',
                  border: '1px solid #EBECEF',
                  color: '#9AA1AD',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Tabs Selector */}
            <div style={{ display: 'flex', borderBottom: '1px solid #EBECEF', marginBottom: '20px', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setSettingsTab('database')}
                style={{
                  padding: '10px 16px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderBottom: settingsTab === 'database' ? '2px solid #E8483D' : '2px solid transparent',
                  color: settingsTab === 'database' ? '#E8483D' : '#5A616E',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transition: 'var(--transition-smooth)'
                }}
              >
                Database Connection
              </button>
              <button
                type="button"
                onClick={() => setSettingsTab('users')}
                style={{
                  padding: '10px 16px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderBottom: settingsTab === 'users' ? '2px solid #E8483D' : '2px solid transparent',
                  color: settingsTab === 'users' ? '#E8483D' : '#5A616E',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transition: 'var(--transition-smooth)'
                }}
              >
                User Accounts
              </button>
            </div>

            {settingsTab === 'database' ? (
              <div>
                <p style={{ fontSize: '0.85rem', color: '#5A616E', marginBottom: '20px', lineHeight: '1.4' }}>
                  Enter your Supabase database parameters. This stores them in your browser local storage to communicate directly with your hosted PostgreSQL tables.
                </p>

                <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#5A616E', display: 'block', marginBottom: '6px' }}>
                      Supabase URL
                    </label>
                    <input
                      type="url"
                      placeholder="https://your-project.supabase.co"
                      value={dbUrl}
                      onChange={(e) => setDbUrl(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#5A616E', display: 'block', marginBottom: '6px' }}>
                      Supabase Anon Key
                    </label>
                    <input
                      type="password"
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                      value={dbAnonKey}
                      onChange={(e) => setDbAnonKey(e.target.value)}
                      required
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px' }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        setDbUrl('');
                        setDbAnonKey('');
                        localStorage.removeItem('supabase_client_url');
                        localStorage.removeItem('supabase_client_anon_key');
                        alert('Cleared credentials! CRM will run in Mock/Demo mode.');
                        setIsSettingsOpen(false);
                        window.location.reload();
                      }}
                    >
                      Clear Config
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                    >
                      Save & Connect
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div>
                {/* User management tab */}
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#16191D', marginBottom: '12px' }}>
                  Create New User Account
                </h4>

                {userError && (
                  <div style={{
                    backgroundColor: '#FDEBE9',
                    border: '1px solid #F6D5CF',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    marginBottom: '14px',
                    fontSize: '0.8rem',
                    color: '#E8483D',
                    fontWeight: 600
                  }}>
                    {userError}
                  </div>
                )}

                {userSuccess && (
                  <div style={{
                    backgroundColor: '#DCFCE7',
                    border: '1px solid #BBF7D0',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    marginBottom: '14px',
                    fontSize: '0.8rem',
                    color: '#16A34A',
                    fontWeight: 600
                  }}>
                    {userSuccess}
                  </div>
                )}

                <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={{ flex: 1 }}>
                      <input
                        type="text"
                        placeholder="Username"
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        required
                        style={{ height: '38px', fontSize: '0.82rem' }}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <input
                        type="password"
                        placeholder="Password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        style={{ height: '38px', fontSize: '0.82rem' }}
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ alignSelf: 'flex-end', height: '36px', padding: '0 16px', fontSize: '0.82rem' }}
                    disabled={isCreatingUser}
                  >
                    {isCreatingUser ? 'Registering...' : 'Register User'}
                  </button>
                </form>

                <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#5A616E', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '10px' }}>
                  Registered Operators
                </h4>

                <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', border: '1px solid #EBECEF', borderRadius: '10px', padding: '10px', backgroundColor: '#FAFBFC' }}>
                  {users.length === 0 ? (
                    <p style={{ textAlign: 'center', color: '#9AA1AD', fontSize: '0.8rem', padding: '20px 0' }}>No users found.</p>
                  ) : (
                    users.map(u => (
                      <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#FFFFFF', border: '1px solid #EBECEF', borderRadius: '8px' }}>
                        <span style={{ fontSize: '0.85rem', color: '#16191D', fontWeight: 700 }}>{u.username}</span>
                        <span style={{ fontSize: '0.72rem', color: '#9AA1AD', fontWeight: 600 }}>
                          {new Date(u.created_at).toLocaleDateString([], { dateStyle: 'short' })}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

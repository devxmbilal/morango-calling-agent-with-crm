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
import { Search, Plus, Database, X, RefreshCw } from 'lucide-react';

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

  return (
    <div className="page-container" style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      
      {/* Sidebar navigation */}
      <Sidebar 
        isDemoMode={isDemoMode} 
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

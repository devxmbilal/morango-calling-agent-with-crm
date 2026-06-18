'use client';

import React, { useState } from 'react';
import { Lead, Meeting, Note } from '@/lib/db';
import { X, Calendar, MessageSquare, Mail, Phone, Briefcase, DollarSign, Tag, Clock, Plus, Edit, Trash } from 'lucide-react';

interface LeadDetailModalProps {
  lead: Lead;
  onClose: () => void;
  onStatusChange: (status: Lead['status']) => void;
  onAddNote: (note: string) => Promise<void>;
  onUpdateNote?: (noteId: string, noteText: string) => Promise<void>;
  onDeleteNote?: (noteId: string) => Promise<void>;
  onAddMeeting: (date: string, link?: string) => Promise<void>;
  onDeleteLead?: (id: string) => Promise<void>;
  onUpdateLead?: (updatedFields: Partial<Lead>) => Promise<void>;
}

export default function LeadDetailModal({
  lead,
  onClose,
  onStatusChange,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
  onAddMeeting,
  onDeleteLead,
  onUpdateLead
}: LeadDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'transcript' | 'notes' | 'meetings'>('transcript');
  const [newNote, setNewNote] = useState('');
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);
  const [isSubmittingMeeting, setIsSubmittingMeeting] = useState(false);
  const [sendEmailOnSchedule, setSendEmailOnSchedule] = useState(true);
  const [sendingEmailId, setSendingEmailId] = useState<string | null>(null);

  // Toast notifications state
  interface ToastItem {
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
    id: number;
  }
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { message, type, id }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  // Lead fields edit state
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [editedName, setEditedName] = useState(lead.name);
  const [editedPhone, setEditedPhone] = useState(lead.phone);
  const [editedEmail, setEditedEmail] = useState(lead.email);
  const [editedCompany, setEditedCompany] = useState(lead.company || '');
  const [editedService, setEditedService] = useState(lead.service);
  const [editedBudget, setEditedBudget] = useState(lead.budget || '');
  const [isSavingDetails, setIsSavingDetails] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSaveDetails = async () => {
    if (!onUpdateLead) return;
    if (!editedName.trim() || !editedPhone.trim() || !editedEmail.trim()) {
      showToast('Name, Phone, and Email are required.', 'error');
      return;
    }

    setIsSavingDetails(true);
    try {
      await onUpdateLead({
        name: editedName,
        phone: editedPhone,
        email: editedEmail,
        company: editedCompany || undefined,
        service: editedService as any,
        budget: editedBudget || undefined
      });
      setIsEditingDetails(false);
      showToast('Lead details updated successfully!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to save details.', 'error');
    } finally {
      setIsSavingDetails(false);
    }
  };

  const handleNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    setIsSubmittingNote(true);
    try {
      await onAddNote(newNote);
      setNewNote('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingNote(false);
    }
  };

  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteText, setEditingNoteText] = useState('');
  const [isUpdatingNote, setIsUpdatingNote] = useState(false);
  const [isDeletingNoteId, setIsDeletingNoteId] = useState<string | null>(null);

  const handleUpdateNoteSubmit = async (noteId: string) => {
    if (!onUpdateNote) return;
    setIsUpdatingNote(true);
    try {
      await onUpdateNote(noteId, editingNoteText);
      setEditingNoteId(null);
      setEditingNoteText('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdatingNote(false);
    }
  };

  const handleDeleteNoteClick = async (noteId: string) => {
    if (!onDeleteNote) return;
    if (!confirm('Are you sure you want to delete this note?')) return;
    setIsDeletingNoteId(noteId);
    try {
      await onDeleteNote(noteId);
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeletingNoteId(null);
    }
  };

  const handleSendMail = async (meet: Meeting | { meeting_date: string; meeting_link?: string }) => {
    if (!lead.email) {
      showToast('This lead has no email address configured.', 'error');
      return;
    }
    const meetId = ('id' in meet) ? meet.id : 'temp-schedule';
    setSendingEmailId(meetId);
    try {
      const response = await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: lead.email,
          name: lead.name,
          service: lead.service,
          meetingLink: meet.meeting_link,
          meetingDate: meet.meeting_date,
        }),
      });
      if (response.ok) {
        showToast('Confirmation email sent successfully!', 'success');
      } else {
        const data = await response.json();
        showToast(`Failed to send email: ${data.error || 'Unknown error'}`, 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to send email due to network error.', 'error');
    } finally {
      setSendingEmailId(null);
    }
  };

  const handleMeetingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingDate) return;
    setIsSubmittingMeeting(true);
    try {
      await onAddMeeting(meetingDate, meetingLink || undefined);
      
      if (sendEmailOnSchedule) {
        if (!lead.email) {
          showToast('Meeting scheduled, but could not send email: Lead has no email address configured.', 'warning');
        } else {
          try {
            const response = await fetch('/api/email', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                to: lead.email,
                name: lead.name,
                service: lead.service,
                meetingLink: meetingLink || undefined,
                meetingDate: meetingDate,
              }),
            });
            if (!response.ok) {
              const data = await response.json();
              showToast(`Meeting scheduled, but email failed: ${data.error || 'Unknown error'}`, 'error');
            } else {
              showToast('Meeting scheduled and confirmation email sent successfully!', 'success');
            }
          } catch (err) {
            console.error('Failed to send confirmation email:', err);
            showToast('Meeting scheduled, but failed to send confirmation email.', 'error');
          }
        }
      } else {
        showToast('Meeting scheduled successfully!', 'success');
      }

      setMeetingDate('');
      setMeetingLink('');
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Failed to schedule meeting.', 'error');
    } finally {
      setIsSubmittingMeeting(false);
    }
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const parseTranscript = (text?: string) => {
    if (!text) return [];
    return text.split('\n').map((line, idx) => {
      const isAgent = line.startsWith('Agent:');
      const isClient = line.startsWith('Client:');
      let speaker = 'System';
      let content = line;

      if (isAgent) {
        speaker = 'Agent';
        content = line.replace('Agent:', '').trim();
      } else if (isClient) {
        speaker = 'Client';
        content = line.replace('Client:', '').trim();
      }

      return { id: idx, speaker, content };
    });
  };

  const transcriptLines = parseTranscript(lead.transcript);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(22, 25, 29, 0.4)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '24px'
    }}>
      {/* Modal Container */}
      <div 
        className="glass-panel" 
        style={{
          width: '100%',
          maxWidth: '900px',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          background: '#FFFFFF',
          border: '1px solid #EBECEF',
          boxShadow: '0 20px 48px rgba(22, 25, 29, 0.08)',
          animation: 'fadeUp 0.3s ease forwards'
        }}
      >
        {/* Modal Header */}
        <div className="modal-header-layout" style={{
          padding: '24px',
          borderBottom: '1px solid #EBECEF',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
              {isEditingDetails ? (
                <input
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  style={{
                    fontSize: '1.3rem',
                    fontWeight: 800,
                    color: '#16191D',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    border: '1px solid #EBECEF',
                    width: '240px'
                  }}
                />
              ) : (
                <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#16191D', letterSpacing: '-0.3px' }}>{lead.name}</h2>
              )}
              <select
                value={lead.status}
                onChange={(e) => onStatusChange(e.target.value as Lead['status'])}
                style={{
                  width: 'auto',
                  padding: '6px 12px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  borderRadius: '6px',
                  backgroundColor: '#FAFBFC',
                  borderColor: '#EBECEF',
                  cursor: 'pointer'
                }}
              >
                <option value="New Lead">New Lead</option>
                <option value="Contacted">Contacted</option>
                <option value="Qualified">Qualified</option>
                <option value="Proposal Sent">Proposal Sent</option>
                <option value="Negotiation">Negotiation</option>
                <option value="Won">Won</option>
                <option value="Lost">Lost</option>
              </select>
            </div>
            {isEditingDetails ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                <Briefcase size={14} color="#9AA1AD" />
                <input
                  type="text"
                  placeholder="Company Name"
                  value={editedCompany}
                  onChange={(e) => setEditedCompany(e.target.value)}
                  style={{
                    fontSize: '0.85rem',
                    padding: '4px 8px',
                    borderRadius: '6px',
                    border: '1px solid #EBECEF',
                    width: '180px',
                    color: '#16191D',
                    fontWeight: 500
                  }}
                />
              </div>
            ) : (
              <p style={{ color: '#5A616E', fontSize: '0.9rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}>
                {lead.company ? (
                  <>
                    <Briefcase size={14} color="#9AA1AD" /> {lead.company}
                  </>
                ) : (
                  'No Company Specified'
                )}
              </p>
            )}
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {isEditingDetails ? (
              <>
                <button
                  onClick={handleSaveDetails}
                  className="btn btn-primary"
                  style={{ padding: '6px 12px', fontSize: '0.8rem', backgroundColor: '#16A34A', borderColor: '#16A34A' }}
                  disabled={isSavingDetails}
                >
                  {isSavingDetails ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => {
                    setIsEditingDetails(false);
                    // Reset to current lead values
                    setEditedName(lead.name);
                    setEditedPhone(lead.phone);
                    setEditedEmail(lead.email);
                    setEditedCompany(lead.company || '');
                    setEditedService(lead.service);
                    setEditedBudget(lead.budget || '');
                  }}
                  className="btn btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '0.8rem', backgroundColor: '#FAFBFC', borderColor: '#EBECEF', color: '#5A616E' }}
                  disabled={isSavingDetails}
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                {onUpdateLead && (
                  <button
                    onClick={() => setIsEditingDetails(true)}
                    className="btn btn-secondary"
                    style={{ padding: '6px 12px', fontSize: '0.8rem', backgroundColor: '#FAFBFC', borderColor: '#EBECEF', color: '#5A616E', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Edit size={12} /> Edit Details
                  </button>
                )}
                {onDeleteLead && (
                  <button 
                    onClick={handleDelete}
                    className="btn btn-danger"
                    style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                  >
                    Delete Lead
                  </button>
                )}
              </>
            )}
            <button
              onClick={onClose}
              style={{
                background: '#FAFBFC',
                border: '1px solid #EBECEF',
                color: '#9AA1AD',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'var(--transition-smooth)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#16191D'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#9AA1AD'}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="modal-body-layout" style={{ display: 'flex', flexGrow: 1, overflow: 'hidden' }}>
          
          {/* Left Panel: Contact info */}
          <div className="modal-side-panel" style={{
            width: '300px',
            borderRight: '1px solid #EBECEF',
            padding: '24px',
            backgroundColor: '#FAFBFC',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}>
            <h3 style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#AEB4BE' }}>
              Contact & Project Details
            </h3>

            {/* Info Items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#FFFFFF', border: '1px solid #EBECEF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Phone size={14} color="#5A616E" />
                </div>
                <div style={{ flexGrow: 1 }}>
                  <p style={{ fontSize: '0.72rem', color: '#5A616E', fontWeight: 700, marginBottom: '2px' }}>Phone</p>
                  {isEditingDetails ? (
                    <input
                      type="text"
                      value={editedPhone}
                      onChange={(e) => setEditedPhone(e.target.value)}
                      style={{
                        fontSize: '0.8rem',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        border: '1px solid #EBECEF',
                        width: '100%',
                        color: '#16191D',
                        fontWeight: 600
                      }}
                    />
                  ) : (
                    <a href={`tel:${lead.phone}`} style={{ fontSize: '0.85rem', color: '#16191D', fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}>
                      {lead.phone || 'N/A'}
                    </a>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#FFFFFF', border: '1px solid #EBECEF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Mail size={14} color="#5A616E" />
                </div>
                <div style={{ minWidth: 0, flexGrow: 1 }}>
                  <p style={{ fontSize: '0.72rem', color: '#5A616E', fontWeight: 700, marginBottom: '2px' }}>Email</p>
                  {isEditingDetails ? (
                    <input
                      type="email"
                      value={editedEmail}
                      onChange={(e) => setEditedEmail(e.target.value)}
                      style={{
                        fontSize: '0.8rem',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        border: '1px solid #EBECEF',
                        width: '100%',
                        color: '#16191D',
                        fontWeight: 600
                      }}
                    />
                  ) : (
                    <a href={`mailto:${lead.email}`} style={{ fontSize: '0.85rem', color: '#16191D', fontWeight: 700, textDecoration: 'none', wordBreak: 'break-all', display: 'block', maxWidth: '210px' }}>
                      {lead.email || 'N/A'}
                    </a>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#FFFFFF', border: '1px solid #EBECEF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Tag size={14} color="#5A616E" />
                </div>
                <div style={{ flexGrow: 1 }}>
                  <p style={{ fontSize: '0.72rem', color: '#5A616E', fontWeight: 700, marginBottom: '2px' }}>Required Service</p>
                  {isEditingDetails ? (
                    <select
                      value={editedService}
                      onChange={(e) => setEditedService(e.target.value as any)}
                      style={{
                        fontSize: '0.8rem',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        border: '1px solid #EBECEF',
                        width: '100%',
                        color: '#16191D',
                        fontWeight: 600,
                        backgroundColor: '#FFF'
                      }}
                    >
                      <option value="AI Agent">AI Agent</option>
                      <option value="Web Development">Web Development</option>
                      <option value="App Development">App Development</option>
                      <option value="DevOps">DevOps</option>
                      <option value="AI Automation">AI Automation</option>
                    </select>
                  ) : (
                    <p style={{ fontSize: '0.85rem', color: '#16191D', fontWeight: 700 }}>{lead.service}</p>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#FFFFFF', border: '1px solid #EBECEF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <DollarSign size={14} color="#16A34A" />
                </div>
                <div style={{ flexGrow: 1 }}>
                  <p style={{ fontSize: '0.72rem', color: '#5A616E', fontWeight: 700, marginBottom: '2px' }}>Estimated Budget</p>
                  {isEditingDetails ? (
                    <input
                      type="text"
                      value={editedBudget}
                      onChange={(e) => setEditedBudget(e.target.value)}
                      style={{
                        fontSize: '0.8rem',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        border: '1px solid #EBECEF',
                        width: '100%',
                        color: '#16191D',
                        fontWeight: 600
                      }}
                    />
                  ) : (
                    <p style={{ fontSize: '0.85rem', color: '#16A34A', fontWeight: 800 }}>{lead.budget || 'Not Specified'}</p>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#FFFFFF', border: '1px solid #EBECEF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Clock size={14} color="#5A616E" />
                </div>
                <div>
                  <p style={{ fontSize: '0.72rem', color: '#5A616E', fontWeight: 700, marginBottom: '2px' }}>Lead Created</p>
                  <p style={{ fontSize: '0.85rem', color: '#16191D', fontWeight: 700 }}>
                    {new Date(lead.created_at).toLocaleDateString([], { dateStyle: 'medium' })}
                  </p>
                </div>
              </div>
            </div>

            {/* Vapi Call Recording Info */}
            {lead.recording_url && (
              <div style={{
                marginTop: '12px',
                padding: '16px',
                borderRadius: '12px',
                backgroundColor: '#FDEBE9',
                border: '1px solid #F6D5CF'
              }}>
                <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: '#E8483D', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.025em' }}>
                  Call Recording
                </h4>
                <audio 
                  src={lead.recording_url} 
                  controls 
                  style={{ width: '100%', height: '32px', outline: 'none' }}
                />
                <p style={{ fontSize: '0.65rem', color: '#7A5650', marginTop: '6px', textAlign: 'center', fontWeight: 500 }}>
                  ID: {lead.vapi_call_id || 'N/A'}
                </p>
              </div>
            )}
          </div>

          {/* Right Panel: Content tabs */}
          <div style={{
            flexGrow: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {/* Tabs Selector */}
            <div style={{
              display: 'flex',
              borderBottom: '1px solid #EBECEF',
              backgroundColor: '#FAFBFC'
            }}>
              <button
                onClick={() => setActiveTab('transcript')}
                style={{
                  padding: '16px 24px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderBottom: activeTab === 'transcript' ? '2px solid #E8483D' : '2px solid transparent',
                  color: activeTab === 'transcript' ? '#E8483D' : '#5A616E',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transition: 'var(--transition-smooth)'
                }}
              >
                Vapi Transcript
              </button>
              
              <button
                onClick={() => setActiveTab('notes')}
                style={{
                  padding: '16px 24px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderBottom: activeTab === 'notes' ? '2px solid #E8483D' : '2px solid transparent',
                  color: activeTab === 'notes' ? '#E8483D' : '#5A616E',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transition: 'var(--transition-smooth)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <MessageSquare size={14} /> Notes ({lead.notes?.length || 0})
              </button>

              <button
                onClick={() => setActiveTab('meetings')}
                style={{
                  padding: '16px 24px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderBottom: activeTab === 'meetings' ? '2px solid #E8483D' : '2px solid transparent',
                  color: activeTab === 'meetings' ? '#E8483D' : '#5A616E',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  transition: 'var(--transition-smooth)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Calendar size={14} /> Meetings ({lead.meetings?.length || 0})
              </button>
            </div>

            {/* Tab Contents */}
            <div style={{ flexGrow: 1, overflowY: 'auto', padding: '24px' }}>
              
              {/* Transcript Tab */}
              {activeTab === 'transcript' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {transcriptLines.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#9AA1AD', padding: '40px 0' }}>
                      No call transcript available for this lead.
                    </div>
                  ) : (
                    transcriptLines.map((line) => {
                      const isAgent = line.speaker === 'Agent';
                      return (
                        <div
                          key={line.id}
                          style={{
                            alignSelf: isAgent ? 'flex-start' : 'flex-end',
                            maxWidth: '80%',
                            background: isAgent ? '#FDEBE9' : '#FAFBFC',
                            border: isAgent ? '1px solid #F6D5CF' : '1px solid #EBECEF',
                            padding: '12px 16px',
                            borderRadius: isAgent ? '0px 14px 14px 14px' : '14px 0px 14px 14px',
                          }}
                        >
                          <p style={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            color: isAgent ? '#E8483D' : '#5A616E',
                            marginBottom: '4px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.025em'
                          }}>
                            {line.speaker}
                          </p>
                          <p style={{ fontSize: '0.85rem', color: '#16191D', lineHeight: '1.45', fontWeight: 500 }}>
                            {line.content}
                          </p>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* Notes Tab */}
              {activeTab === 'notes' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Add Note Form */}
                  <form onSubmit={handleNoteSubmit} style={{ display: 'flex', gap: '10px' }}>
                    <input
                      type="text"
                      placeholder="Add an internal follow-up note..."
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      disabled={isSubmittingNote}
                    />
                    <button
                      type="submit"
                      className="btn btn-primary"
                      style={{ padding: '0 20px', flexShrink: 0 }}
                      disabled={isSubmittingNote}
                    >
                      Add
                    </button>
                  </form>

                  {/* Notes List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {(!lead.notes || lead.notes.length === 0) ? (
                      <div style={{ textAlign: 'center', color: '#9AA1AD', padding: '24px 0' }}>
                        No notes yet. Add the first internal note above.
                      </div>
                    ) : (
                      lead.notes.map((note) => {
                        const isEditing = editingNoteId === note.id;
                        return (
                          <div
                            key={note.id}
                            style={{
                              background: '#FAFBFC',
                              border: '1px solid #EBECEF',
                              borderRadius: '10px',
                              padding: '14px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '8px'
                            }}
                          >
                            {isEditing ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <input
                                  type="text"
                                  value={editingNoteText}
                                  onChange={(e) => setEditingNoteText(e.target.value)}
                                  disabled={isUpdatingNote}
                                  style={{ width: '100%' }}
                                  autoFocus
                                />
                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingNoteId(null);
                                      setEditingNoteText('');
                                    }}
                                    disabled={isUpdatingNote}
                                    style={{
                                      padding: '4px 10px',
                                      fontSize: '0.75rem',
                                      fontWeight: 700,
                                      borderRadius: '6px',
                                      backgroundColor: '#FAFBFC',
                                      border: '1px solid #EBECEF',
                                      color: '#5A616E',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateNoteSubmit(note.id)}
                                    disabled={isUpdatingNote || !editingNoteText.trim()}
                                    className="btn btn-primary"
                                    style={{
                                      padding: '4px 10px',
                                      fontSize: '0.75rem',
                                    }}
                                  >
                                    {isUpdatingNote ? 'Saving...' : 'Save'}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <p style={{ fontSize: '0.85rem', color: '#16191D', margin: 0, lineHeight: '1.45', fontWeight: 500 }}>
                                  {note.note}
                                </p>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                                  <p style={{ fontSize: '0.7rem', color: '#9AA1AD', fontWeight: 600, margin: 0 }}>
                                    {new Date(note.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                  </p>
                                  <div style={{ display: 'flex', gap: '6px' }}>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingNoteId(note.id);
                                        setEditingNoteText(note.note);
                                      }}
                                      disabled={isDeletingNoteId === note.id}
                                      style={{
                                        background: 'none',
                                        border: 'none',
                                        color: '#9AA1AD',
                                        cursor: 'pointer',
                                        padding: '4px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        transition: 'color 0.2s'
                                      }}
                                      onMouseEnter={(e) => e.currentTarget.style.color = '#2563EB'}
                                      onMouseLeave={(e) => e.currentTarget.style.color = '#9AA1AD'}
                                      title="Edit Note"
                                    >
                                      <Edit size={14} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteNoteClick(note.id)}
                                      disabled={isDeletingNoteId === note.id}
                                      style={{
                                        background: 'none',
                                        border: 'none',
                                        color: '#9AA1AD',
                                        cursor: 'pointer',
                                        padding: '4px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        transition: 'color 0.2s'
                                      }}
                                      onMouseEnter={(e) => e.currentTarget.style.color = '#E8483D'}
                                      onMouseLeave={(e) => e.currentTarget.style.color = '#9AA1AD'}
                                      title="Delete Note"
                                    >
                                      <Trash size={14} />
                                    </button>
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {/* Meetings Tab */}
              {activeTab === 'meetings' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  
                  {/* Add Meeting Form */}
                  <div style={{
                    background: '#FAFBFC',
                    border: '1px solid #EBECEF',
                    borderRadius: '12px',
                    padding: '16px'
                  }}>
                    <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#16191D', marginBottom: '12px' }}>
                      Schedule New Meeting
                    </h4>
                    <form onSubmit={handleMeetingSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: '0.7rem', color: '#5A616E', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                            Meeting Date & Time
                          </label>
                          <input
                            type="datetime-local"
                            value={meetingDate}
                            onChange={(e) => setMeetingDate(e.target.value)}
                            required
                          />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: '0.7rem', color: '#5A616E', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                            Google Meet / Calendly Link
                          </label>
                          <input
                            type="url"
                            placeholder="https://meet.google.com/..."
                            value={meetingLink}
                            onChange={(e) => setMeetingLink(e.target.value)}
                          />
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: '#5A616E', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={sendEmailOnSchedule}
                            onChange={(e) => setSendEmailOnSchedule(e.target.checked)}
                            style={{ width: 'auto', cursor: 'pointer' }}
                          />
                          Send Confirmation Email to Lead
                        </label>
                        <button
                          type="submit"
                          className="btn btn-primary"
                          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                          disabled={isSubmittingMeeting}
                        >
                          <Plus size={16} /> Schedule
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Meetings List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#5A616E', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                      Scheduled Meetings
                    </h4>
                    {(!lead.meetings || lead.meetings.length === 0) ? (
                      <div style={{ textAlign: 'center', color: '#9AA1AD', padding: '24px 0' }}>
                        No meetings scheduled yet.
                      </div>
                    ) : (
                      lead.meetings.map((meet) => (
                        <div
                          key={meet.id}
                          style={{
                            background: '#FFFFFF',
                            border: '1px solid #EBECEF',
                            borderRadius: '10px',
                            padding: '14px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                              <Calendar size={14} color="#2563EB" />
                              <p style={{ fontSize: '0.85rem', color: '#16191D', fontWeight: 700 }}>
                                {new Date(meet.meeting_date).toLocaleString([], { dateStyle: 'long', timeStyle: 'short' })}
                              </p>
                            </div>
                            {meet.meeting_link && (
                              <a
                                href={meet.meeting_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ fontSize: '0.75rem', color: '#2563EB', textDecoration: 'none', fontWeight: 600 }}
                              >
                                Join Call &rarr;
                              </a>
                            )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {meet.status === 'Scheduled' && (
                              <button
                                type="button"
                                onClick={() => handleSendMail(meet)}
                                disabled={sendingEmailId === meet.id}
                                style={{
                                  padding: '4px 10px',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  borderRadius: '6px',
                                  backgroundColor: '#FAFBFC',
                                  border: '1px solid #EBECEF',
                                  color: '#5A616E',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                  if (sendingEmailId !== meet.id) {
                                    e.currentTarget.style.backgroundColor = '#FDEBE9';
                                    e.currentTarget.style.borderColor = '#F6D5AF';
                                    e.currentTarget.style.color = '#E8483D';
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (sendingEmailId !== meet.id) {
                                    e.currentTarget.style.backgroundColor = '#FAFBFC';
                                    e.currentTarget.style.borderColor = '#EBECEF';
                                    e.currentTarget.style.color = '#5A616E';
                                  }
                                }}
                              >
                                <Mail size={12} />
                                {sendingEmailId === meet.id ? 'Sending...' : 'Send Mail'}
                              </button>
                            )}
                            <span className="tag" style={{
                              backgroundColor: meet.status === 'Scheduled' ? '#DBEAFE' : '#DCFCE7',
                              color: meet.status === 'Scheduled' ? '#2563EB' : '#16A34A',
                              border: 'none'
                            }}>
                              {meet.status}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Toast container */}
      <div style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 1100,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        pointerEvents: 'none'
      }}>
        {toasts.map(toast => (
          <div
            key={toast.id}
            style={{
              pointerEvents: 'auto',
              minWidth: '320px',
              padding: '16px 20px',
              borderRadius: '12px',
              background: toast.type === 'success' 
                ? '#ECFDF5' 
                : toast.type === 'error' 
                ? '#FEF2F2' 
                : toast.type === 'warning'
                ? '#FFFBEB'
                : '#EFF6FF',
              border: `1px solid ${
                toast.type === 'success' 
                  ? '#10B981' 
                  : toast.type === 'error' 
                  ? '#EF4444' 
                  : toast.type === 'warning'
                  ? '#F59E0B'
                  : '#3B82F6'
              }`,
              color: toast.type === 'success' 
                ? '#065F46' 
                : toast.type === 'error' 
                ? '#991B1B' 
                : toast.type === 'warning'
                ? '#78350F'
                : '#1E40AF',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
              fontWeight: 600,
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              animation: 'slideInRight 0.3s ease-out forwards'
            }}
          >
            <span>{toast.message}</span>
            <button
              onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'inherit',
                cursor: 'pointer',
                fontSize: '1rem',
                opacity: 0.7,
                padding: '4px',
                display: 'flex',
                alignItems: 'center'
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '0.7'}
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* Custom Delete Confirmation Overlay */}
      {showDeleteConfirm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(22, 25, 29, 0.4)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            padding: '24px',
            width: '360px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            textAlign: 'center',
            border: '1px solid #ECEDEF'
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: '#FDEBE9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <Trash size={22} color="#E8483D" />
            </div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 800, color: '#16191D' }}>Delete Lead</h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: '#5A616E', lineHeight: 1.5, fontWeight: 500 }}>
              Are you sure you want to delete <strong>{lead.name}</strong>? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                style={{
                  flex: 1,
                  padding: '10px 0',
                  borderRadius: '10px',
                  border: '1px solid #EBECEF',
                  background: '#FFFFFF',
                  color: '#5A616E',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  setShowDeleteConfirm(false);
                  if (onDeleteLead) {
                    await onDeleteLead(lead.id);
                  }
                }}
                style={{
                  flex: 1,
                  padding: '10px 0',
                  borderRadius: '10px',
                  border: 'none',
                  background: '#E8483D',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'opacity 0.2s'
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

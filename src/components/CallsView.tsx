'use client';

import React from 'react';
import { Lead } from '@/lib/db';
import { Phone, Play, MessageSquare, AlertCircle } from 'lucide-react';

interface CallsViewProps {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
}

export default function CallsView({ leads, onSelectLead }: CallsViewProps) {
  
  // Show all leads that came from a Vapi call, whether or not transcript/recording is ready yet
  const callLeads = leads.filter(l =>
    l.source === 'Vapi Call' || l.vapi_call_id || l.recording_url || l.transcript
  );

  // Status colors helper
  const getStatusColor = (status: Lead['status']) => {
    switch (status) {
      case 'Won': return { fg: '#16A34A', bg: '#DCFCE7' };
      case 'Qualified': return { fg: '#D97706', bg: '#FEF3C7' };
      case 'New Lead': return { fg: '#2563EB', bg: '#DBEAFE' };
      case 'Lost': return { fg: '#64748B', bg: '#F1F5F9' };
      default: return { fg: '#5A616E', bg: '#F1F2F4' };
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  // Helper to extract first 3 lines of transcript for snippet
  const getTranscriptSnippet = (transcript?: string) => {
    if (!transcript) return [];
    return transcript.split('\n')
      .filter(l => l.trim())
      .slice(0, 3)
      .map((line, i) => {
        const isAgent = /^(AI|Agent|Assistant|Bot)\s*:/i.test(line);
        const isClient = /^(User|Client|Human|Caller)\s*:/i.test(line);
        let speaker = 'Agent';
        let content = line;
        if (isAgent) {
          speaker = 'AI';
          content = line.replace(/^(AI|Agent|Assistant|Bot)\s*:\s*/i, '').trim();
        } else if (isClient) {
          speaker = 'Client';
          content = line.replace(/^(User|Client|Human|Caller)\s*:\s*/i, '').trim();
        }
        return { id: i, speaker, content };
      });
  };

  // Helper to generate AI summary
  const getAiSummary = (lead: Lead) => {
    if (lead.notes && lead.notes.length > 0) {
      return lead.notes[lead.notes.length - 1].note;
    }
    return `Client ${lead.name} called expressing interest in ${lead.service} services. Gained company details, budget requirements, and scheduled follow-up steps.`;
  };

  return (
    <div style={{ animation: 'fadeUp 0.3s ease', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      
      {callLeads.length === 0 ? (
        <div style={{
          background: '#fff',
          border: '1px solid #ECEDEF',
          borderRadius: '16px',
          padding: '40px',
          textAlign: 'center',
          color: '#9AA1AD'
        }}>
          <AlertCircle size={36} style={{ marginBottom: '12px' }} />
          <p style={{ fontSize: '0.9rem', fontWeight: 600 }}>No Call Logs Available</p>
          <p style={{ fontSize: '0.8rem', marginTop: '4px' }}>Leads created via Vapi calls will appear here automatically.</p>
        </div>
      ) : (
        callLeads.map((lead, index) => {
          const statusStyles = getStatusColor(lead.status);
          const initials = getInitials(lead.name);
          const transcriptSnippet = getTranscriptSnippet(lead.transcript);
          const aiSummary = getAiSummary(lead);

          // Render the first/most recent call log with detailed audio player & summaries
          if (index === 0) {
            return (
              <div
                key={lead.id}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #ECEDEF',
                  borderRadius: '16px',
                  padding: '18px 20px',
                }}
              >
                {/* Header info */}
                <div style={{ display: 'flex', alignItems: 'center', justifycontent: 'space-between', marginBottom: '14px' } as any}>
                  <div 
                    onClick={() => onSelectLead(lead)}
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
                  >
                    <span style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '50%',
                      background: '#FDEBE9',
                      color: '#E8483D',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '13px'
                    }}>
                      {initials}
                    </span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '14.5px', color: '#16191D' }}>
                        {lead.name} &middot; {lead.company || 'No Company'}
                      </div>
                      <div style={{ fontSize: '12px', color: '#9AA1AD', fontWeight: 500 }}>
                        Inbound &middot; {new Date(lead.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                      </div>
                    </div>
                  </div>
                  
                  <span style={{
                    fontSize: '11.5px',
                    fontWeight: 700,
                    color: statusStyles.fg,
                    background: statusStyles.bg,
                    padding: '4px 10px',
                    borderRadius: '8px'
                  }}>
                    {lead.status}
                  </span>
                </div>

                {/* HTML5 Audio Player */}
                {lead.recording_url ? (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                    background: '#FAFBFC',
                    border: '1px solid #F1F2F4',
                    borderRadius: '12px',
                    padding: '11px 14px',
                    marginBottom: '14px'
                  }}>
                    <audio
                      src={lead.recording_url}
                      controls
                      style={{ width: '100%', height: '32px', outline: 'none' }}
                    />
                  </div>
                ) : (
                  <div style={{
                    background: '#FFFBEB', border: '1px solid #FDE68A',
                    borderRadius: '10px', padding: '10px 14px', marginBottom: '14px',
                    fontSize: '12px', color: '#92400E', fontWeight: 500
                  }}>
                    Recording not available yet — it will appear here after the call ends and Vapi sends the report.
                  </div>
                )}

                {/* AI Summary & Snippet info */}
                <div className="calls-detail-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

                  {/* Summary */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '8px' }}>
                      <Phone size={13} color="#E8483D" />
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#16191D' }}>AI Summary</span>
                    </div>
                    {(() => {
                      const summaryNote = lead.notes?.find(n => n.note.startsWith('[Call Summary]'));
                      const intentNote = lead.notes?.find(n => n.note.startsWith('[AI Intent Analysis]'));
                      const text = summaryNote
                        ? summaryNote.note.replace('[Call Summary]', '').trim()
                        : intentNote
                          ? intentNote.note.replace('[AI Intent Analysis]', '').trim()
                          : null;
                      return text ? (
                        <p style={{ margin: 0, fontSize: '12.5px', color: '#5A616E', lineHeight: '1.6', fontWeight: 500 }}>{text}</p>
                      ) : (
                        <p style={{ margin: 0, fontSize: '12px', color: '#9AA1AD', fontStyle: 'italic' }}>Summary will appear here after the call ends.</p>
                      );
                    })()}
                  </div>

                  {/* Transcript Snippet */}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '8px' }}>
                      <MessageSquare size={13} color="#9AA1AD" />
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#16191D' }}>Transcript snippet</span>
                    </div>
                    {transcriptSnippet.length > 0 ? (
                      <div style={{ fontSize: '12px', color: '#5A616E', lineHeight: '1.6', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        {transcriptSnippet.map((s) => (
                          <div key={s.id}>
                            <span style={{ fontWeight: 700, color: s.speaker === 'AI' ? '#E8483D' : '#16191D' }}>
                              {s.speaker}:
                            </span>{' '}
                            {s.content}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ margin: 0, fontSize: '12px', color: '#9AA1AD', fontStyle: 'italic' }}>Transcript not available yet.</p>
                    )}
                  </div>

                </div>

              </div>
            );
          }

          {/* Render remaining call logs as compact row items */}
          return (
            <div
              key={lead.id}
              onClick={() => onSelectLead(lead)}
              style={{
                background: '#FFFFFF',
                border: '1px solid #ECEDEF',
                borderRadius: '16px',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                cursor: 'pointer',
                transition: 'var(--transition-smooth)'
              }}
              className="hover-call-row"
            >
              <span style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                background: '#EEF2FF',
                color: '#4F46E5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '13px',
                flexShrink: 0
              }}>
                {initials}
              </span>
              
              <button style={{
                width: '34px',
                height: '34px',
                borderRadius: '50%',
                background: '#F1F2F4',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <Play size={13} fill="#5A616E" stroke="none" />
              </button>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#16191D' }}>
                  {lead.name} &middot; {lead.company || 'No Company'}{' '}
                  <span style={{ fontWeight: 500, color: '#9AA1AD', fontSize: '12px' }}>
                    &mdash; {lead.service} interest. Call log saved.
                  </span>
                </div>
              </div>

              <span style={{ fontSize: '12px', color: '#9AA1AD', fontWeight: 600, flexShrink: 0 }}>
                —
              </span>

              <span style={{
                fontSize: '11px',
                fontWeight: 700,
                color: statusStyles.fg,
                background: statusStyles.bg,
                padding: '4px 9px',
                borderRadius: '8px',
                flexShrink: 0
              }}>
                {lead.status}
              </span>
            </div>
          );
        })
      )}

      <style jsx global>{`
        .hover-call-row:hover {
          border-color: #E8483D !important;
          box-shadow: 0 4px 12px rgba(22,25,29,0.03);
        }
      `}</style>
    </div>
  );
}

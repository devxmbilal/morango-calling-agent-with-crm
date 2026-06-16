'use client';

import React from 'react';
import { Lead } from '@/lib/db';
import { Briefcase, Calendar, MessageSquare, PhoneCall, DollarSign } from 'lucide-react';

interface LeadCardProps {
  lead: Lead;
  onSelect: (lead: Lead) => void;
}

export default function LeadCard({ lead, onSelect }: LeadCardProps) {
  // Service tag helper classes
  const getServiceTagClass = (service: Lead['service']) => {
    switch (service) {
      case 'AI Agent': return 'tag-ai-agent';
      case 'Web Development': return 'tag-web-dev';
      case 'App Development': return 'tag-app-dev';
      case 'DevOps': return 'tag-devops';
      case 'AI Automation': return 'tag-ai-automation';
      default: return '';
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', lead.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const latestMeeting = lead.meetings && lead.meetings.length > 0
    ? lead.meetings.find(m => m.status === 'Scheduled') || lead.meetings[0]
    : null;

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onClick={() => onSelect(lead)}
      className="glass-panel"
      style={{
        padding: '14px',
        borderRadius: '12px',
        cursor: 'grab',
        marginBottom: '10px',
        border: '1px solid #ECEDEF',
        background: '#FFFFFF',
        position: 'relative',
        userSelect: 'none',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.borderColor = '#E8483D';
        e.currentTarget.style.boxShadow = '0 6px 16px rgba(22, 25, 29, 0.04)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.borderColor = '#ECEDEF';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Service Tag & Source */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <span className={`tag ${getServiceTagClass(lead.service)}`}>
          {lead.service}
        </span>
        <span style={{ fontSize: '0.68rem', color: '#9AA1AD', fontWeight: 600 }}>
          {lead.source}
        </span>
      </div>

      {/* Lead Name & Company */}
      <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#16191D', marginBottom: '4px', letterSpacing: '-0.1px' }}>
        {lead.name}
      </h4>
      {lead.company && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#5A616E', fontSize: '0.78rem', marginBottom: '10px' }}>
          <Briefcase size={11} color="#9AA1AD" />
          <span>{lead.company}</span>
        </div>
      )}

      {/* Info Indicators */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '12px',
        fontSize: '0.72rem',
        color: '#5A616E',
        borderTop: '1px solid #F1F2F4',
        paddingTop: '8px',
        fontWeight: 600,
      }}>
        {lead.budget && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <DollarSign size={11} color="#16A34A" />
            <span style={{ color: '#16A34A' }}>{lead.budget}</span>
          </div>
        )}

        {lead.recording_url && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }} title="Call Recording Available">
            <PhoneCall size={11} color="#E8483D" />
            <span style={{ color: '#E8483D' }}>Call Log</span>
          </div>
        )}

        {latestMeeting && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }} title="Scheduled Meeting">
            <Calendar size={11} color="#2563EB" />
            <span style={{ color: '#2563EB' }}>
              {new Date(latestMeeting.meeting_date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
            </span>
          </div>
        )}

        {lead.notes && lead.notes.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }} title="Notes Count">
            <MessageSquare size={11} color="#9AA1AD" />
            <span style={{ color: '#9AA1AD' }}>{lead.notes.length}</span>
          </div>
        )}
      </div>
    </div>
  );
}

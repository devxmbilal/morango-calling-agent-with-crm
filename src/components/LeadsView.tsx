'use client';

import React, { useState } from 'react';
import { Lead } from '@/lib/db';
import { Plus, Search } from 'lucide-react';

interface LeadsViewProps {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
  onAddLeadClick: (status: Lead['status']) => void;
}

type FilterStatus = 'All' | 'New Lead' | 'Qualified' | 'Won';

export default function LeadsView({ leads, onSelectLead, onAddLeadClick }: LeadsViewProps) {
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter lists by status and search query
  const filtered = leads.filter((lead) => {
    const matchesStatus = activeFilter === 'All' || lead.status === activeFilter;
    if (!matchesStatus) return false;

    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      lead.name.toLowerCase().includes(query) ||
      (lead.email && lead.email.toLowerCase().includes(query)) ||
      (lead.phone && lead.phone.includes(query)) ||
      (lead.company && lead.company.toLowerCase().includes(query)) ||
      lead.service.toLowerCase().includes(query) ||
      lead.status.toLowerCase().includes(query)
    );
  });

  // Count helper
  const getCount = (status: FilterStatus) => {
    if (status === 'All') return leads.length;
    if (status === 'New Lead') return leads.filter(l => l.status === 'New Lead').length;
    if (status === 'Qualified') return leads.filter(l => l.status === 'Qualified').length;
    if (status === 'Won') return leads.filter(l => l.status === 'Won').length;
    return 0;
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const getStatusColor = (status: Lead['status']) => {
    switch (status) {
      case 'Won': return { fg: '#16A34A', bg: '#DCFCE7' };
      case 'Qualified': return { fg: '#D97706', bg: '#FEF3C7' };
      case 'New Lead': return { fg: '#2563EB', bg: '#DBEAFE' };
      case 'Lost': return { fg: '#64748B', bg: '#F1F5F9' };
      default: return { fg: '#5A616E', bg: '#F1F2F4' };
    }
  };

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

  return (
    <div style={{ animation: 'fadeUp 0.3s ease', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* TOOLBAR */}
      <div className="leads-toolbar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
        
        {/* Filters Grid */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {(['All', 'New Lead', 'Qualified', 'Won'] as FilterStatus[]).map((tab) => {
            const isActive = activeFilter === tab;
            const label = tab === 'New Lead' ? 'New' : tab === 'All' ? 'All leads' : tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveFilter(tab)}
                style={{
                  fontSize: '12.5px',
                  fontWeight: isActive ? 700 : 600,
                  color: isActive ? '#FFFFFF' : '#5A616E',
                  background: isActive ? '#16191D' : '#FFFFFF',
                  border: isActive ? 'none' : '1px solid #ECEDEF',
                  padding: '8px 14px',
                  borderRadius: '9px',
                  cursor: 'pointer',
                  transition: 'var(--transition-smooth)'
                }}
              >
                {label} &middot; {getCount(tab)}
              </button>
            );
          })}
        </div>

        {/* Search Input and Add Lead Button */}
        <div className="leads-toolbar-actions" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Search Input */}
          <div style={{ position: 'relative', width: '200px' }}>
            <Search size={14} color="#9AA1AD" style={{ position: 'absolute', left: '12px', top: '11px' }} />
            <input
              type="text"
              placeholder="Search leads..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                paddingLeft: '38px',
                borderRadius: '10px',
                height: '36px',
                background: '#FAFBFC',
                borderColor: '#EBECEF',
                fontSize: '12.5px',
                width: '100%',
              }}
            />
          </div>

          {/* Add Lead Action Button */}
          <button
            onClick={() => onAddLeadClick('New Lead')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '7px',
              fontSize: '13px',
              fontWeight: 700,
              color: '#FFFFFF',
              background: '#E8483D',
              border: 'none',
              padding: '0 16px',
              height: '36px',
              borderRadius: '10px',
              cursor: 'pointer',
              transition: 'var(--transition-smooth)'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#d03d33'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#E8483D'}
          >
            <Plus size={15} /> Add Lead
          </button>
        </div>

      </div>

      {/* LEADS TABLE CONTAINER */}
      <div className="table-container-responsive" style={{ background: '#fff', border: '1px solid #ECEDEF', borderRadius: '16px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', color: '#9AA1AD', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', background: '#FAFBFC' }}>
              <th style={{ padding: '13px 18px' }}>Lead</th>
              <th className="col-hide-sm" style={{ padding: '13px 18px' }}>Phone</th>
              <th className="col-hide-sm" style={{ padding: '13px 18px' }}>Company</th>
              <th className="col-hide-md" style={{ padding: '13px 18px' }}>Interest</th>
              <th className="col-hide-md" style={{ padding: '13px 18px' }}>Meeting</th>
              <th className="col-hide-md" style={{ padding: '13px 18px' }}>Call Log</th>
              <th style={{ padding: '13px 18px' }}>Status</th>
            </tr>
          </thead>
          <tbody style={{ fontSize: '13px' }}>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ padding: '30px', textAlign: 'center', color: '#9AA1AD', fontWeight: 500 }}>
                  No leads found matching the selected status.
                </td>
              </tr>
            ) : (
              filtered.map((lead) => {
                const statusStyles = getStatusColor(lead.status);
                const initials = getInitials(lead.name);
                const meetingStr = lead.meetings && lead.meetings.length > 0
                  ? new Date(lead.meetings[0].meeting_date).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                  : '—';

                return (
                  <tr
                    key={lead.id}
                    onClick={() => onSelectLead(lead)}
                    style={{ borderTop: '1px solid #F1F2F4', cursor: 'pointer' }}
                    className="hover-row"
                  >
                    {/* Lead */}
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{
                          width: '34px', height: '34px', borderRadius: '50%',
                          background: statusStyles.bg, color: statusStyles.fg,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 700, fontSize: '12px', flexShrink: 0
                        }}>
                          {initials}
                        </span>
                        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.3, minWidth: 0 }}>
                          <span style={{ fontWeight: 700, color: '#16191D', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }}>{lead.name}</span>
                          <span style={{ fontSize: '11px', color: '#9AA1AD', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }}>{lead.email}</span>
                          {/* Mobile: show phone + service inline under name */}
                          <span className="mobile-only-meta" style={{ fontSize: '11px', color: '#5A616E', marginTop: '2px' }}>
                            {lead.phone || ''}{lead.phone && lead.service ? ' · ' : ''}{lead.service}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Phone */}
                    <td className="col-hide-sm" style={{ padding: '12px 14px', color: '#5A616E' }}>{lead.phone || 'N/A'}</td>

                    {/* Company */}
                    <td className="col-hide-sm" style={{ padding: '12px 14px', color: '#5A616E', fontWeight: 600 }}>{lead.company || '—'}</td>

                    {/* Interest */}
                    <td className="col-hide-md" style={{ padding: '12px 14px' }}>
                      <span className={`tag ${getServiceTagClass(lead.service)}`}>{lead.service}</span>
                    </td>

                    {/* Meeting */}
                    <td className="col-hide-md" style={{ padding: '12px 14px', color: lead.meetings && lead.meetings.length > 0 ? '#2563EB' : '#5A616E', fontWeight: lead.meetings && lead.meetings.length > 0 ? 600 : 500 }}>
                      {meetingStr}
                    </td>

                    {/* Call Log */}
                    <td className="col-hide-md" style={{ padding: '12px 14px', color: '#5A616E', fontWeight: 600 }}>—</td>

                    {/* Status */}
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{
                        fontSize: '11px', fontWeight: 700,
                        color: statusStyles.fg, background: statusStyles.bg,
                        padding: '4px 8px', borderRadius: '8px', whiteSpace: 'nowrap'
                      }}>
                        {lead.status}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <style jsx global>{`
        .hover-row:hover { background-color: #FAFBFC; }
        .mobile-only-meta { display: none; }

        @media (max-width: 768px) {
          .col-hide-md { display: none; }
        }
        @media (max-width: 520px) {
          .col-hide-sm { display: none; }
          .mobile-only-meta { display: block; }
          .leads-toolbar {
            flex-direction: column !important;
            align-items: stretch !important;
          }
          .leads-toolbar-actions {
            flex-direction: column !important;
          }
          .leads-toolbar-actions input {
            width: 100% !important;
          }
          .leads-toolbar-actions > div {
            width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
}

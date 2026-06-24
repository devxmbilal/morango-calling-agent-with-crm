'use client';

import React from 'react';
import { Lead } from '@/lib/db';
import { Phone, Calendar, TrendingUp, Users, ArrowRight } from 'lucide-react';

interface OverviewViewProps {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
  onNavigateToTab: (tab: string) => void;
}

export default function OverviewView({ leads, onSelectLead, onNavigateToTab }: OverviewViewProps) {
  // 1. Dynamic Calculations based on real leads data (no mock offsets)
  const totalCalls = leads.filter(l => l.vapi_call_id || l.recording_url).length;
  const totalMeetings = leads.reduce((acc, l) => acc + (l.meetings?.length || 0), 0);
  const activeLeadsCount = leads.filter(l => l.status !== 'Won' && l.status !== 'Lost').length;
  
  const wonLeads = leads.filter(l => l.status === 'Won').length;
  const totalLeads = leads.length;
  const conversionRate = totalLeads === 0 ? '0.0' : ((wonLeads / totalLeads) * 100).toFixed(1);

  // Status counts for Snapshot
  const newCount = leads.filter(l => l.status === 'New Lead').length;
  const qualifiedCount = leads.filter(l => l.status === 'Qualified').length;
  const meetingSetCount = leads.filter(l => l.meetings && l.meetings.some(m => m.status === 'Scheduled')).length;
  const wonCount = leads.filter(l => l.status === 'Won').length;

  // Recent leads (limit to 4)
  const recentLeads = leads.slice(0, 4);

  // Calculate day-by-day weekly stats based on actual leads created_at timestamp
  const getCallTrendData = () => {
    const counts = [0, 0, 0, 0, 0, 0, 0]; // Mon-Sun
    const meetCounts = [0, 0, 0, 0, 0, 0, 0];
    
    leads.forEach(lead => {
      const date = new Date(lead.created_at);
      let dayIndex = date.getDay() - 1; // Sun=0, Mon=1...
      if (dayIndex < 0) dayIndex = 6; // Sun
      
      counts[dayIndex] = counts[dayIndex] + 1;
      if (lead.meetings && lead.meetings.length > 0) {
        meetCounts[dayIndex] = meetCounts[dayIndex] + 1;
      }
    });

    const maxVal = Math.max(...counts, ...meetCounts, 1);

    return [
      { label: 'Mon', call: counts[0], meet: meetCounts[0] },
      { label: 'Tue', call: counts[1], meet: meetCounts[1] },
      { label: 'Wed', call: counts[2], meet: meetCounts[2] },
      { label: 'Thu', call: counts[3], meet: meetCounts[3] },
      { label: 'Fri', call: counts[4], meet: meetCounts[4] },
      { label: 'Sat', call: counts[5], meet: meetCounts[5] },
      { label: 'Sun', call: counts[6], meet: meetCounts[6] }
    ].map(d => ({
      label: d.label,
      callPct: counts.reduce((a, b) => a + b, 0) === 0 ? 0 : Math.round((d.call / maxVal) * 100),
      meetPct: meetCounts.reduce((a, b) => a + b, 0) === 0 ? 0 : Math.round((d.meet / maxVal) * 100),
      rawCall: d.call,
      rawMeet: d.meet
    }));
  };

  const trendData = getCallTrendData();

  // Progress bar percentages
  const newPct = totalLeads === 0 ? 0 : Math.round((newCount / totalLeads) * 100);
  const qualifiedPct = totalLeads === 0 ? 0 : Math.round((qualifiedCount / totalLeads) * 100);
  const meetingSetPct = totalLeads === 0 ? 0 : Math.round((meetingSetCount / totalLeads) * 100);
  const wonPct = totalLeads === 0 ? 0 : Math.round((wonCount / totalLeads) * 100);

  // Avatar helper
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

  return (
    <div style={{ animation: 'fadeUp 0.3s ease', display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '32px' }}>
      
      {/* STAT CARDS */}
      <div className="stats-grid overview-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        
        {/* Total Calls */}
        <div style={{ background: '#fff', border: '1px solid #ECEDEF', borderRadius: '16px', padding: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 0 14px 0' }}>
            <span style={{ width: '38px', height: '38px', borderRadius: '11px', background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Phone size={18} color="#4F46E5" />
            </span>
          </div>
          <div style={{ fontSize: '27px', fontWeight: 800, color: '#16191D', letterSpacing: '-0.6px' }}>{totalCalls}</div>
          <div style={{ fontSize: '12.5px', color: '#9AA1AD', fontWeight: 600, marginTop: '2px' }}>Total Calls</div>
        </div>

        {/* Meetings Booked */}
        <div style={{ background: '#fff', border: '1px solid #ECEDEF', borderRadius: '16px', padding: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 0 14px 0' }}>
            <span style={{ width: '38px', height: '38px', borderRadius: '11px', background: '#FDEBE9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Calendar size={18} color="#E8483D" />
            </span>
          </div>
          <div style={{ fontSize: '27px', fontWeight: 800, color: '#16191D', letterSpacing: '-0.6px' }}>{totalMeetings}</div>
          <div style={{ fontSize: '12.5px', color: '#9AA1AD', fontWeight: 600, marginTop: '2px' }}>Meetings Booked</div>
        </div>

        {/* Conversion Rate */}
        <div style={{ background: '#fff', border: '1px solid #ECEDEF', borderRadius: '16px', padding: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 0 14px 0' }}>
            <span style={{ width: '38px', height: '38px', borderRadius: '11px', background: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={18} color="#059669" />
            </span>
          </div>
          <div style={{ fontSize: '27px', fontWeight: 800, color: '#16191D', letterSpacing: '-0.6px' }}>{conversionRate}%</div>
          <div style={{ fontSize: '12.5px', color: '#9AA1AD', fontWeight: 600, marginTop: '2px' }}>Conversion Rate</div>
        </div>

        {/* Active Leads */}
        <div style={{ background: '#fff', border: '1px solid #ECEDEF', borderRadius: '16px', padding: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 0 14px 0' }}>
            <span style={{ width: '38px', height: '38px', borderRadius: '11px', background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={18} color="#D97706" />
            </span>
          </div>
          <div style={{ fontSize: '27px', fontWeight: 800, color: '#16191D', letterSpacing: '-0.6px' }}>{activeLeadsCount}</div>
          <div style={{ fontSize: '12.5px', color: '#9AA1AD', fontWeight: 600, marginTop: '2px' }}>Active Leads</div>
        </div>

      </div>

      {/* CHART & PIPELINE SNAPSHOT */}
      <div className="overview-split-grid" style={{ display: 'grid', gridTemplateColumns: '1.7fr 1fr', gap: '16px', gridTemplateRows: 'auto' }}>
        
        {/* Weekly Calls Bar Chart */}
        <div style={{ background: '#fff', border: '1px solid #ECEDEF', borderRadius: '16px', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#16191D' }}>Calls over time</h3>
              <span style={{ fontSize: '12px', color: '#9AA1AD', fontWeight: 500 }}>Last 7 days</span>
            </div>
            <div style={{ display: 'flex', gap: '14px', fontSize: '11.5px', fontWeight: 600, color: '#6A7180' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '9px', height: '9px', borderRadius: '3px', background: '#E8483D' }}></span>Calls</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ width: '9px', height: '9px', borderRadius: '3px', background: '#F8C6BE' }}></span>Meetings</span>
            </div>
          </div>
          
          {/* Custom CSS Bar chart elements representing weekly call loads */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '18px', height: '180px', padding: '0 6px' }}>
            {trendData.map((d, index) => (
              <div key={index} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '100%', display: 'flex', gap: '4px', alignItems: 'flex-end', height: '160px' }}>
                  <div style={{ flex: 1, height: `${d.callPct}%`, background: '#E8483D', borderRadius: '6px 6px 0 0' }} title={`${d.rawCall} Calls`}></div>
                  <div style={{ flex: 1, height: `${d.meetPct}%`, background: '#F8C6BE', borderRadius: '6px 6px 0 0' }} title={`${d.rawMeet} Meetings`}></div>
                </div>
                <span style={{ fontSize: '11px', color: '#9AA1AD', fontWeight: 600 }}>{d.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Pipeline Snapshot Cards */}
        <div style={{ background: '#fff', border: '1px solid #ECEDEF', borderRadius: '16px', padding: '20px' }}>
          <h3 style={{ margin: '0 0 18px 0', fontSize: '15px', fontWeight: 700, color: '#16191D' }}>Pipeline snapshot</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            
            {/* New */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
                <span style={{ color: '#5A616E' }}>New</span>
                <span style={{ color: '#16191D' }}>{newCount}</span>
              </div>
              <div style={{ height: '8px', background: '#F1F2F4', borderRadius: '6px', overflow: 'hidden' }}>
                <div style={{ width: `${newPct}%`, height: '100%', background: '#2563EB', borderRadius: '6px' }}></div>
              </div>
            </div>

            {/* Qualified */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
                <span style={{ color: '#5A616E' }}>Qualified</span>
                <span style={{ color: '#16191D' }}>{qualifiedCount}</span>
              </div>
              <div style={{ height: '8px', background: '#F1F2F4', borderRadius: '6px', overflow: 'hidden' }}>
                <div style={{ width: `${qualifiedPct}%`, height: '100%', background: '#D97706', borderRadius: '6px' }}></div>
              </div>
            </div>

            {/* Meeting set */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
                <span style={{ color: '#5A616E' }}>Meeting set</span>
                <span style={{ color: '#16191D' }}>{meetingSetCount}</span>
              </div>
              <div style={{ height: '8px', background: '#F1F2F4', borderRadius: '6px', overflow: 'hidden' }}>
                <div style={{ width: `${meetingSetPct}%`, height: '100%', background: '#E8483D', borderRadius: '6px' }}></div>
              </div>
            </div>

            {/* Won */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px', fontWeight: 600, marginBottom: '6px' }}>
                <span style={{ color: '#5A616E' }}>Won</span>
                <span style={{ color: '#16191D' }}>{wonCount}</span>
              </div>
              <div style={{ height: '8px', background: '#F1F2F4', borderRadius: '6px', overflow: 'hidden' }}>
                <div style={{ width: `${wonPct}%`, height: '100%', background: '#16A34A', borderRadius: '6px' }}></div>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* RECENT LEADS FROM CALLS */}
      <div style={{ background: '#fff', border: '1px solid #ECEDEF', borderRadius: '16px', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px 10px' }}>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#16191D' }}>Recent leads from calls</h3>
          <button
            onClick={() => onNavigateToTab('leads')}
            style={{ fontSize: '12.5px', fontWeight: 700, color: '#E8483D', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            View all &rarr;
          </button>
        </div>

        {/* Desktop Table */}
        <table className="overview-recent-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ textAlign: 'left', color: '#9AA1AD', fontSize: '11.5px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              <th style={{ padding: '10px 18px' }}>Lead</th>
              <th style={{ padding: '10px 18px' }}>Company</th>
              <th style={{ padding: '10px 18px' }}>Interest</th>
              <th style={{ padding: '10px 18px' }}>Meeting</th>
              <th style={{ padding: '10px 18px' }}>Status</th>
            </tr>
          </thead>
          <tbody style={{ fontSize: '13px' }}>
            {recentLeads.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#9AA1AD' }}>No leads registered yet.</td></tr>
            ) : (
              recentLeads.map((lead) => {
                const statusStyles = getStatusColor(lead.status);
                const initials = getInitials(lead.name);
                const meetingDate = lead.meetings && lead.meetings.length > 0
                  ? new Date(lead.meetings[0].meeting_date).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                  : '—';
                return (
                  <tr key={lead.id} onClick={() => onSelectLead(lead)} style={{ borderTop: '1px solid #F1F2F4', cursor: 'pointer' }} className="hover-row">
                    <td style={{ padding: '13px 18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ width: '32px', height: '32px', borderRadius: '50%', background: statusStyles.bg, color: statusStyles.fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '12px', flexShrink: 0 }}>{initials}</span>
                        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.3 }}>
                          <span style={{ fontWeight: 700, color: '#16191D' }}>{lead.name}</span>
                          <span style={{ fontSize: '11.5px', color: '#9AA1AD' }}>{lead.email}</span>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '13px 18px', color: '#5A616E', fontWeight: 600 }}>{lead.company || '—'}</td>
                    <td style={{ padding: '13px 18px', color: '#5A616E' }}>{lead.service}</td>
                    <td style={{ padding: '13px 18px', color: '#5A616E' }}>{meetingDate}</td>
                    <td style={{ padding: '13px 18px' }}>
                      <span style={{ fontSize: '11.5px', fontWeight: 700, color: statusStyles.fg, background: statusStyles.bg, padding: '4px 10px', borderRadius: '8px' }}>{lead.status}</span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Mobile Cards */}
        <div className="overview-recent-cards">
          {recentLeads.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: '#9AA1AD', fontSize: '13px' }}>No leads registered yet.</div>
          ) : (
            recentLeads.map((lead) => {
              const statusStyles = getStatusColor(lead.status);
              const initials = getInitials(lead.name);
              const meetingDate = lead.meetings && lead.meetings.length > 0
                ? new Date(lead.meetings[0].meeting_date).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                : null;
              return (
                <div
                  key={lead.id}
                  onClick={() => onSelectLead(lead)}
                  style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderTop: '1px solid #F1F2F4', cursor: 'pointer' }}
                  className="hover-row"
                >
                  <span style={{ width: '36px', height: '36px', borderRadius: '50%', background: statusStyles.bg, color: statusStyles.fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '13px', flexShrink: 0 }}>{initials}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, color: '#16191D', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.name}</div>
                    <div style={{ fontSize: '11.5px', color: '#9AA1AD', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.service}{lead.company ? ` · ${lead.company}` : ''}</div>
                    {meetingDate && <div style={{ fontSize: '11px', color: '#2563EB', fontWeight: 600, marginTop: '2px' }}>📅 {meetingDate}</div>}
                  </div>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: statusStyles.fg, background: statusStyles.bg, padding: '3px 8px', borderRadius: '7px', flexShrink: 0 }}>{lead.status}</span>
                </div>
              );
            })
          )}
        </div>
      </div>

      <style jsx global>{`
        .hover-row:hover { background-color: #FAFBFC; }
        .overview-recent-cards { display: none; }

        @media (max-width: 600px) {
          .overview-stats-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          .overview-split-grid {
            grid-template-columns: 1fr !important;
          }
          .overview-recent-table { display: none; }
          .overview-recent-cards { display: block; }
        }
      `}</style>
    </div>
  );
}

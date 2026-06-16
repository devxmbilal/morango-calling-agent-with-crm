'use client';

import React from 'react';
import { Lead, Meeting } from '@/lib/db';
import { Calendar, Video, Clock, TrendingUp } from 'lucide-react';

interface MeetingsViewProps {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
}

interface AggregatedMeeting extends Meeting {
  leadName: string;
  companyName?: string;
  leadService: string;
  lead: Lead;
}

export default function MeetingsView({ leads, onSelectLead }: MeetingsViewProps) {
  
  // 1. Gather all meetings from all leads
  const meetingsList: AggregatedMeeting[] = [];
  leads.forEach((lead) => {
    if (lead.meetings) {
      lead.meetings.forEach((meet) => {
        meetingsList.push({
          ...meet,
          leadName: lead.name,
          companyName: lead.company,
          leadService: lead.service,
          lead: lead
        });
      });
    }
  });

  // Sort chronologically: future meetings first, then past
  const now = new Date();
  const upcomingMeetings = meetingsList
    .filter((m) => new Date(m.meeting_date) >= now)
    .sort((a, b) => new Date(a.meeting_date).getTime() - new Date(b.meeting_date).getTime());
    
  const pastMeetings = meetingsList
    .filter((m) => new Date(m.meeting_date) < now)
    .sort((a, b) => new Date(b.meeting_date).getTime() - new Date(a.meeting_date).getTime());

  // Template baseline placeholders if no meetings exist in DB yet
  const PLACEHOLDER_UPCOMING = [
    {
      id: 'placeholder-1',
      meeting_date: '2026-06-18T15:00:00Z',
      meeting_link: 'https://meet.google.com/abc-defg-hij',
      status: 'Scheduled',
      leadName: 'Sara Hussain',
      companyName: 'Bright Solutions',
      leadService: 'AI voice agent'
    },
    {
      id: 'placeholder-2',
      meeting_date: '2026-06-19T11:30:00Z',
      meeting_link: 'https://zoom.us/j/123456789',
      status: 'Scheduled',
      leadName: 'Bilal Ahmed',
      companyName: 'NexCart',
      leadService: 'Lead automation'
    },
    {
      id: 'placeholder-3',
      meeting_date: '2026-06-20T14:00:00Z',
      meeting_link: 'https://meet.google.com/xyz-pdq-rst',
      status: 'Scheduled',
      leadName: 'Hamza Raza',
      companyName: 'FinLoop',
      leadService: 'Appointment booking'
    }
  ];

  const displayUpcoming = upcomingMeetings.length > 0 
    ? upcomingMeetings 
    : PLACEHOLDER_UPCOMING;

  return (
    <div style={{ animation: 'fadeUp 0.3s ease', display: 'grid', gridTemplateColumns: '1fr 320px', gap: '16px', alignItems: 'start' }}>
      
      {/* LEFT COLUMN: MEETINGS LIST */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        
        {/* Upcoming Section */}
        <h3 style={{ margin: '0 0 2px 0', fontSize: '14px', fontWeight: 700, color: '#9AA1AD', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Upcoming &middot; {displayUpcoming.length}
        </h3>

        {displayUpcoming.map((meet) => {
          const date = new Date(meet.meeting_date);
          const day = date.getDate();
          const monthStr = date.toLocaleDateString([], { month: 'short' }).toUpperCase();
          const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const hasLead = 'lead' in meet;

          return (
            <div
              key={meet.id}
              onClick={() => {
                if (hasLead && meet.lead) {
                  onSelectLead(meet.lead);
                }
              }}
              style={{
                background: '#FFFFFF',
                border: '1px solid #ECEDEF',
                borderRadius: '14px',
                padding: '16px 18px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                cursor: hasLead ? 'pointer' : 'default',
                transition: 'var(--transition-smooth)'
              }}
              className={hasLead ? 'hover-meeting' : ''}
            >
              {/* Date Box */}
              <div style={{
                width: '56px',
                flexShrink: 0,
                textAlign: 'center',
                background: '#FDEBE9',
                borderRadius: '12px',
                padding: '9px 0'
              }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#E8483D' }}>{monthStr}</div>
                <div style={{ fontSize: '21px', fontWeight: 800, color: '#16191D', lineHeight: 1 }}>{day}</div>
              </div>

              {/* Title & Client details */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '14.5px', color: '#16191D' }}>
                  Demo — {meet.leadService}
                </div>
                <div style={{ fontSize: '12.5px', color: '#9AA1AD', marginTop: '2px', fontWeight: 500 }}>
                  {meet.leadName} &middot; {meet.companyName || 'No Company'}
                </div>
              </div>

              {/* Timing & Channel */}
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#16191D' }}>{timeStr}</div>
                <div style={{ fontSize: '11.5px', color: '#9AA1AD', fontWeight: 500, marginTop: '2px' }}>
                  {meet.meeting_link?.includes('zoom') ? 'Zoom' : 'Google Meet'}
                </div>
              </div>

              {/* Dot indicator */}
              <span style={{
                width: '9px',
                height: '9px',
                borderRadius: '50%',
                background: '#16A34A',
                boxShadow: '0 0 0 3px #DCFCE7',
                flexShrink: 0
              }}></span>
            </div>
          );
        })}

        {/* Past Section */}
        {pastMeetings.length > 0 && (
          <>
            <h3 style={{ margin: '14px 0 2px 0', fontSize: '14px', fontWeight: 700, color: '#9AA1AD', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Past
            </h3>
            {pastMeetings.map((meet) => {
              const date = new Date(meet.meeting_date);
              const day = date.getDate();
              const monthStr = date.toLocaleDateString([], { month: 'short' }).toUpperCase();

              return (
                <div
                  key={meet.id}
                  onClick={() => onSelectLead(meet.lead)}
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #ECEDEF',
                    borderRadius: '14px',
                    padding: '16px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    opacity: 0.72,
                    cursor: 'pointer'
                  }}
                  className="hover-meeting"
                >
                  <div style={{
                    width: '56px',
                    flexShrink: 0,
                    textAlign: 'center',
                    background: '#F1F2F4',
                    borderRadius: '12px',
                    padding: '9px 0'
                  }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#9AA1AD' }}>{monthStr}</div>
                    <div style={{ fontSize: '21px', fontWeight: 800, color: '#16191D', lineHeight: 1 }}>{day}</div>
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '14.5px', color: '#16191D' }}>
                      Intro call — {meet.leadService}
                    </div>
                    <div style={{ fontSize: '12.5px', color: '#9AA1AD', marginTop: '2px', fontWeight: 500 }}>
                      {meet.leadName} &middot; {meet.companyName || 'No Company'}
                    </div>
                  </div>

                  <span className="tag" style={{
                    backgroundColor: '#DCFCE7',
                    color: '#16A34A',
                    border: 'none'
                  }}>
                    Completed
                  </span>
                </div>
              );
            })}
          </>
        )}

      </div>

      {/* RIGHT COLUMN: STATS SNAPSHOT */}
      <div style={{ background: '#fff', border: '1px solid #ECEDEF', borderRadius: '16px', padding: '18px', height: 'fit-content' }}>
        <h3 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: 700, color: '#16191D' }}>This week</h3>
        <p style={{ margin: '0 0 16px 0', fontSize: '12.5px', color: '#9AA1AD', fontWeight: 500 }}>15 &ndash; 21 June 2026</p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '13px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13px', color: '#5A616E', fontWeight: 600 }}>Meetings booked</span>
            <span style={{ fontSize: '16px', fontWeight: 800, color: '#16191D' }}>{displayUpcoming.length}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13px', color: '#5A616E', fontWeight: 600 }}>Show-up rate</span>
            <span style={{ fontSize: '16px', fontWeight: 800, color: '#16A34A' }}>80%</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13px', color: '#5A616E', fontWeight: 600 }}>Avg. duration</span>
            <span style={{ fontSize: '16px', fontWeight: 800, color: '#16191D' }}>41m</span>
          </div>
        </div>

        <div style={{ marginTop: '18px', paddingTop: '16px', borderTop: '1px solid #F1F2F4' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <TrendingUp size={15} color="#E8483D" />
            <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#16191D' }}>Booked by Vapi agent</span>
          </div>
          <p style={{ margin: 0, fontSize: '11.5px', color: '#9AA1AD', lineHeight: 1.5, fontWeight: 500 }}>
            All meetings above were auto-scheduled from live calls and confirmed via n8n email integrations.
          </p>
        </div>
      </div>

      <style jsx global>{`
        .hover-meeting:hover {
          border-color: #E8483D !important;
          box-shadow: 0 4px 12px rgba(22,25,29,0.03);
        }
      `}</style>
    </div>
  );
}

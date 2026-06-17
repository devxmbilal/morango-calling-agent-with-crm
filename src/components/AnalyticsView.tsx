'use client';

import React from 'react';
import { Lead } from '@/lib/db';

interface AnalyticsViewProps {
  leads: Lead[];
}

export default function AnalyticsView({ leads }: AnalyticsViewProps) {
  
  // 1. Gather real outcome stats (no mock offsets)
  const wonCount = leads.filter(l => l.status === 'Won').length;
  const meetingSetCount = leads.filter(l => l.meetings && l.meetings.some(m => m.status === 'Scheduled')).length;
  const qualifiedCount = leads.filter(l => l.status === 'Qualified').length;
  const newCount = leads.filter(l => l.status === 'New Lead').length;
  const lostCount = leads.filter(l => l.status === 'Lost').length;
  const totalCount = wonCount + meetingSetCount + qualifiedCount + newCount + lostCount;

  // Outcome percentages for conic gradient chart
  const wonPct = totalCount === 0 ? 0 : (wonCount / totalCount) * 100;
  const meetingPct = totalCount === 0 ? 0 : (meetingSetCount / totalCount) * 100;
  const qualifiedPct = totalCount === 0 ? 0 : (qualifiedCount / totalCount) * 100;
  const newPct = totalCount === 0 ? 0 : (newCount / totalCount) * 100;

  // Angles for conic gradient
  const a1 = wonPct;
  const a2 = a1 + meetingPct;
  const a3 = a2 + qualifiedPct;
  const a4 = a3 + newPct;

  // Dynamic monthly trend data calculation based on real leads dates (last 6 calendar months)
  const getMonthlyTrendData = () => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const data: { month: string; year: number; monthIndex: number; call: number; meet: number; }[] = [];
    
    // Get last 6 months starting from current month going backwards
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      data.push({
        month: monthNames[d.getMonth()],
        year: d.getFullYear(),
        monthIndex: d.getMonth(),
        call: 0,
        meet: 0
      });
    }

    leads.forEach(lead => {
      const leadDate = new Date(lead.created_at);
      const leadMonth = leadDate.getMonth();
      const leadYear = leadDate.getFullYear();
      
      const bucket = data.find(b => b.monthIndex === leadMonth && b.year === leadYear);
      if (bucket) {
        bucket.call += 1;
        if (lead.meetings && lead.meetings.length > 0) {
          bucket.meet += 1;
        }
      }
    });

    const maxCallVal = Math.max(...data.map(d => d.call), 1);
    const maxMeetVal = Math.max(...data.map(d => d.meet), 1);
    const maxOverall = Math.max(maxCallVal, maxMeetVal);

    return data.map(d => ({
      month: d.month,
      callPct: data.reduce((a, b) => a + b.call, 0) === 0 ? 0 : Math.round((d.call / maxOverall) * 100),
      meetPct: data.reduce((a, b) => a + b.meet, 0) === 0 ? 0 : Math.round((d.meet / maxOverall) * 100),
      rawCall: d.call,
      rawMeet: d.meet
    }));
  };

  const monthlyData = getMonthlyTrendData();

  // Dynamic Metrics Footer computations
  const callLeads = leads.filter(l => l.vapi_call_id || l.recording_url);
  const totalCalls = callLeads.length;
  
  const meetingLeads = leads.filter(l => l.meetings && l.meetings.length > 0);
  const totalMeetingsBooked = meetingLeads.length;
  const callToMeetingRate = callLeads.length === 0 ? '0.0%' : `${((meetingLeads.length / callLeads.length) * 100).toFixed(1)}%`;

  const conicBg = totalCount === 0 
    ? '#F1F2F4' 
    : `conic-gradient(#16A34A 0% ${a1}%, #E8483D ${a1}% ${a2}%, #D97706 ${a2}% ${a3}%, #2563EB ${a3}% ${a4}%, #64748B ${a4}% 100%)`;

  return (
    <div style={{ animation: 'fadeUp 0.3s ease', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* CHART GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '16px' }}>
        
        {/* Monthly Trend Chart */}
        <div style={{ background: '#fff', border: '1px solid #ECEDEF', borderRadius: '16px', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#16191D' }}>Calls &amp; conversion</h3>
            <span style={{ fontSize: '12px', color: '#9AA1AD', fontWeight: 600 }}>Last 6 months</span>
          </div>
          <div style={{ fontSize: '12.5px', color: '#9AA1AD', marginBottom: '20px', fontWeight: 500 }}>
            Total calls vs. meetings booked
          </div>
          
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '22px', height: '200px' }}>
            {monthlyData.map((d, index) => (
              <div key={index} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '9px' }}>
                <div style={{ width: '100%', display: 'flex', gap: '5px', alignItems: 'flex-end', height: '175px', justifyContent: 'center' }}>
                  <div style={{ width: '38%', height: `${d.callPct}%`, background: '#F8C6BE', borderRadius: '6px 6px 0 0' }} title={`${d.rawCall} Calls`}></div>
                  <div style={{ width: '38%', height: `${d.meetPct}%`, background: '#E8483D', borderRadius: '6px 6px 0 0' }} title={`${d.rawMeet} Meetings`}></div>
                </div>
                <span style={{ fontSize: '11px', color: '#9AA1AD', fontWeight: 600 }}>{d.month}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Lead Outcomes Conic Donut Chart */}
        <div style={{ background: '#fff', border: '1px solid #ECEDEF', borderRadius: '16px', padding: '20px' }}>
          <h3 style={{ margin: '0 0 18px 0', fontSize: '15px', fontWeight: 700, color: '#16191D' }}>Lead outcomes</h3>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            {/* Conic Donut Chart Wrapper */}
            <div style={{
              width: '128px',
              height: '128px',
              borderRadius: '50%',
              flexShrink: 0,
              background: conicBg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <div style={{
                width: '78px',
                height: '78px',
                borderRadius: '50%',
                background: '#FFFFFF',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <span style={{ fontSize: '21px', fontWeight: 800, color: '#16191D' }}>{totalCount}</span>
                <span style={{ fontSize: '10.5px', color: '#9AA1AD', fontWeight: 600 }}>leads</span>
              </div>
            </div>

            {/* Outcomes breakdown table */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12.5px', flexGrow: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ width: '9px', height: '9px', borderRadius: '3px', background: '#16A34A' }}></span><span style={{ color: '#5A616E', fontWeight: 600 }}>Won</span><span style={{ marginLeft: 'auto', fontWeight: 700, color: '#16191D' }}>{wonCount}</span></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ width: '9px', height: '9px', borderRadius: '3px', background: '#E8483D' }}></span><span style={{ color: '#5A616E', fontWeight: 600 }}>Meeting set</span><span style={{ marginLeft: 'auto', fontWeight: 700, color: '#16191D' }}>{meetingSetCount}</span></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ width: '9px', height: '9px', borderRadius: '3px', background: '#D97706' }}></span><span style={{ color: '#5A616E', fontWeight: 600 }}>Qualified</span><span style={{ marginLeft: 'auto', fontWeight: 700, color: '#16191D' }}>{qualifiedCount}</span></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ width: '9px', height: '9px', borderRadius: '3px', background: '#2563EB' }}></span><span style={{ color: '#5A616E', fontWeight: 600 }}>New</span><span style={{ marginLeft: 'auto', fontWeight: 700, color: '#16191D' }}>{newCount}</span></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ width: '9px', height: '9px', borderRadius: '3px', background: '#64748B' }}></span><span style={{ color: '#5A616E', fontWeight: 600 }}>Lost</span><span style={{ marginLeft: 'auto', fontWeight: 700, color: '#16191D' }}>{lostCount}</span></div>
            </div>
          </div>
        </div>

      </div>

      {/* CALL METRICS FOOTER */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
        
        {/* Card 1 */}
        <div style={{ background: '#fff', border: '1px solid #ECEDEF', borderRadius: '16px', padding: '20px' }}>
          <div style={{ fontSize: '12.5px', color: '#9AA1AD', fontWeight: 600 }}>Total Calls</div>
          <div style={{ fontSize: '26px', fontWeight: 800, margin: '6px 0 2px 0', color: '#16191D' }}>{totalCalls}</div>
          <div style={{ fontSize: '12px', color: '#9AA1AD', fontWeight: 700 }}>From Vapi integration</div>
        </div>

        {/* Card 2 */}
        <div style={{ background: '#fff', border: '1px solid #ECEDEF', borderRadius: '16px', padding: '20px' }}>
          <div style={{ fontSize: '12.5px', color: '#9AA1AD', fontWeight: 600 }}>Call &rarr; meeting rate</div>
          <div style={{ fontSize: '26px', fontWeight: 800, margin: '6px 0 2px 0', color: '#16191D' }}>{callToMeetingRate}</div>
          <div style={{ fontSize: '12px', color: '#9AA1AD', fontWeight: 700 }}>Conversion percentage</div>
        </div>

        {/* Card 3 */}
        <div style={{ background: '#fff', border: '1px solid #ECEDEF', borderRadius: '16px', padding: '20px' }}>
          <div style={{ fontSize: '12.5px', color: '#9AA1AD', fontWeight: 600 }}>Total Meetings</div>
          <div style={{ fontSize: '26px', fontWeight: 800, margin: '6px 0 2px 0', color: '#16191D' }}>{totalMeetingsBooked}</div>
          <div style={{ fontSize: '12px', color: '#9AA1AD', fontWeight: 700 }}>Scheduled on calendar</div>
        </div>

      </div>

    </div>
  );
}

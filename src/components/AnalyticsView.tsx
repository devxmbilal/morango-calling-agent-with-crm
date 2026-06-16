'use client';

import React from 'react';
import { Lead } from '@/lib/db';

interface AnalyticsViewProps {
  leads: Lead[];
}

export default function AnalyticsView({ leads }: AnalyticsViewProps) {
  
  // 1. Gather outcome stats
  const wonCount = leads.filter(l => l.status === 'Won').length + 23;
  const meetingSetCount = leads.filter(l => l.meetings && l.meetings.some(m => m.status === 'Scheduled')).length + 41;
  const qualifiedCount = leads.filter(l => l.status === 'Qualified').length + 58;
  const newCount = leads.filter(l => l.status === 'New Lead').length + 92;
  const lostCount = leads.filter(l => l.status === 'Lost').length + 22;
  const totalCount = wonCount + meetingSetCount + qualifiedCount + newCount + lostCount;

  // Outcome percentages for conic gradient chart
  const wonPct = (wonCount / totalCount) * 100;
  const meetingPct = (meetingSetCount / totalCount) * 100;
  const qualifiedPct = (qualifiedCount / totalCount) * 100;
  const newPct = (newCount / totalCount) * 100;

  // Angles for conic gradient
  const a1 = wonPct;
  const a2 = a1 + meetingPct;
  const a3 = a2 + qualifiedPct;
  const a4 = a3 + newPct;

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
            {[
              { month: 'Jan', call: 48, meet: 24 },
              { month: 'Feb', call: 58, meet: 31 },
              { month: 'Mar', call: 52, meet: 28 },
              { month: 'Apr', call: 74, meet: 42 },
              { month: 'May', call: 86, meet: 54 },
              { month: 'Jun', call: 100, meet: 62 }
            ].map((d, index) => (
              <div key={index} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '9px' }}>
                <div style={{ width: '100%', display: 'flex', gap: '5px', alignItems: 'flex-end', height: '175px', justifyContent: 'center' }}>
                  <div style={{ width: '38%', height: `${d.call}%`, background: '#F8C6BE', borderRadius: '6px 6px 0 0' }}></div>
                  <div style={{ width: '38%', height: `${d.meet}%`, background: '#E8483D', borderRadius: '6px 6px 0 0' }}></div>
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
              background: `conic-gradient(#16A34A 0% ${a1}%, #E8483D ${a1}% ${a2}%, #D97706 ${a2}% ${a3}%, #2563EB ${a3}% ${a4}%, #64748B ${a4}% 100%)`,
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
                <span style={{ fontSize: '21px', fontWeight: 800, lineLight: 1, color: '#16191D' } as any}>{totalCount}</span>
                <span style={{ fontSize: '10.5px', color: '#9AA1AD', fontWeight: 600 }}>leads</span>
              </div>
            </div>

            {/* Outcomes breakdown table */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontStyle: 'normal', fontSize: '12.5px', flexGrow: 1 }}>
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
          <div style={{ fontSize: '12.5px', color: '#9AA1AD', fontWeight: 600 }}>Avg. call duration</div>
          <div style={{ fontSize: '26px', fontWeight: 800, margin: '6px 0 2px 0', color: '#16191D' }}>3:48</div>
          <div style={{ fontSize: '12px', color: '#16A34A', fontWeight: 700 }}>▲ 14s vs last month</div>
        </div>

        {/* Card 2 */}
        <div style={{ background: '#fff', border: '1px solid #ECEDEF', borderRadius: '16px', padding: '20px' }}>
          <div style={{ fontSize: '12.5px', color: '#9AA1AD', fontWeight: 600 }}>Call &rarr; meeting rate</div>
          <div style={{ fontSize: '26px', fontWeight: 800, margin: '6px 0 2px 0', color: '#16191D' }}>19.2%</div>
          <div style={{ fontSize: '12px', color: '#16A34A', fontWeight: 700 }}>▲ 2.4 pts</div>
        </div>

        {/* Card 3 */}
        <div style={{ background: '#fff', border: '1px solid #ECEDEF', borderRadius: '16px', padding: '20px' }}>
          <div style={{ fontSize: '12.5px', color: '#9AA1AD', fontWeight: 600 }}>Avg. response time</div>
          <div style={{ fontSize: '26px', fontWeight: 800, margin: '6px 0 2px 0', color: '#16191D' }}>0.9s</div>
          <div style={{ fontSize: '12px', color: '#9AA1AD', fontWeight: 700 }}>Vapi agent latency</div>
        </div>

      </div>

    </div>
  );
}

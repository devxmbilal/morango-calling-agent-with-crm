'use client';

import React from 'react';
import { Mail, ShieldCheck, Clock } from 'lucide-react';

export default function EmailView() {
  
  const emails = [
    { id: 1, subject: 'Demo confirmation — 18 Jun, 3 PM', to: 'sara.h@brightpk.com', name: 'Sara Hussain', time: '2:49 PM', status: 'Opened', color: '#16A34A', bg: '#DCFCE7' },
    { id: 2, subject: 'Discovery call invite + agenda', to: 'bilal@nexcart.io', name: 'Bilal Ahmed', time: '11:02 AM', status: 'Opened', color: '#16A34A', bg: '#DCFCE7' },
    { id: 3, subject: 'Thanks for your time + brochure', to: 'f.malik@zaytun.co', name: 'Fatima Malik', time: 'Yesterday', status: 'Delivered', color: '#2563EB', bg: '#DBEAFE' },
    { id: 4, subject: 'Onboarding details — patient reminders', to: 'ayesha@medixcare.pk', name: 'Ayesha Nadeem', time: 'Yesterday', status: 'Opened', color: '#16A34A', bg: '#DCFCE7' },
    { id: 5, subject: 'Follow-up — keeping in touch', to: 'usman@dealpoint.pk', name: 'Usman Khan', time: '2 days ago', status: 'Sent', color: '#64748B', bg: '#F1F5F9' }
  ];

  return (
    <div style={{ animation: 'fadeUp 0.3s ease', display: 'grid', gridTemplateColumns: '1fr 300px', gap: '16px', alignItems: 'start' }}>
      
      {/* LEFT COLUMN: AUTOMATED EMAILS LOG */}
      <div style={{ background: '#fff', border: '1px solid #ECEDEF', borderRadius: '16px', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '15px 20px', borderBottom: '1px solid #F1F2F4' }}>
          <span style={{ width: '30px', height: '30px', borderRadius: '8px', background: '#FDEBE9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Mail size={15} color="#E8483D" />
          </span>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#16191D' }}>Automated emails</div>
            <div style={{ fontSize: '11.5px', color: '#9AA1AD', fontWeight: 600 }}>Sent by n8n workflow after each call</div>
          </div>
        </div>

        {/* List items */}
        {emails.map((email) => (
          <div 
            key={email.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              padding: '15px 20px',
              borderBottom: '1px solid #F1F2F4',
              transition: 'var(--transition-smooth)'
            }}
            className="hover-email-row"
          >
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: email.status === 'Opened' ? '#16A34A' : email.status === 'Delivered' ? '#2563EB' : '#9AA1AD',
              flexShrink: 0
            }} />
            
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#16191D' }}>{email.subject}</div>
              <div style={{ fontSize: '12px', color: '#9AA1AD', marginTop: '1px', fontWeight: 500 }}>
                To: {email.to} &middot; {email.name}
              </div>
            </div>

            <span style={{ fontSize: '11px', color: '#5A616E', fontWeight: 600 }}>{email.time}</span>
            
            <span style={{
              fontSize: '11px',
              fontWeight: 700,
              color: email.color,
              background: email.bg,
              padding: '4px 9px',
              borderRadius: '8px',
              flexShrink: 0
            }}>
              {email.status}
            </span>
          </div>
        ))}
      </div>

      {/* RIGHT COLUMN: INSIGHTS & N8N STATUS */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* Email Stats snapshot */}
        <div style={{ background: '#fff', border: '1px solid #ECEDEF', borderRadius: '16px', padding: '18px' }}>
          <h3 style={{ margin: '0 0 14px 0', fontSize: '14px', fontWeight: 700, color: '#16191D' }}>Email stats</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '13px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12.5px', color: '#5A616E', fontWeight: 600 }}>Sent (7d)</span>
              <span style={{ fontSize: '16px', fontWeight: 800, color: '#16191D' }}>142</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12.5px', color: '#5A616E', fontWeight: 600 }}>Open rate</span>
              <span style={{ fontSize: '16px', fontWeight: 800, color: '#16A34A' }}>71%</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12.5px', color: '#5A616E', fontWeight: 600 }}>Reply rate</span>
              <span style={{ fontSize: '16px', fontWeight: 800, color: '#16191D' }}>34%</span>
            </div>
          </div>
        </div>

        {/* n8n Status Node card */}
        <div style={{ background: '#0F1115', borderRadius: '16px', padding: '18px', color: '#fff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#16A34A',
              boxShadow: '0 0 0 3px rgba(22,163,74,0.25)'
            }}></span>
            <span style={{ fontSize: '13px', fontWeight: 700 }}>n8n workflow</span>
            <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#16A34A', fontWeight: 700 }}>Active</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', fontSize: '11.5px', color: '#A8AEB8' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ color: '#E8483D' }}>&bull;</span> Call ended &rarr; webhook</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '6px', color: '#6B7280' }}>&darr;</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ color: '#E8483D' }}>&bull;</span> Extract lead data &rarr; CRM</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '6px', color: '#6B7280' }}>&darr;</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ color: '#E8483D' }}>&bull;</span> Send follow-up email</div>
          </div>

          <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid #23262D', fontSize: '11px', color: '#6B7280', fontWeight: 500 }}>
            Last run &middot; 2 min ago &middot; 0 errors
          </div>
        </div>

      </div>
    </div>
  );
}

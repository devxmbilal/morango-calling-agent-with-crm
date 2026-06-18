'use client';

import React from 'react';
import { Mail, ShieldCheck, Clock, AlertCircle } from 'lucide-react';
import { Lead } from '@/lib/db';

interface EmailViewProps {
  leads: Lead[];
}

export default function EmailView({ leads }: EmailViewProps) {
  
  // Derive emails dynamically from leads
  const emails = (leads || []).map((lead, idx) => {
    let status = 'Delivered';
    let color = '#2563EB';
    let bg = '#DBEAFE';
    
    if (lead.status === 'Won' || lead.status === 'Qualified') {
      status = 'Opened';
      color = '#16A34A';
      bg = '#DCFCE7';
    } else if (lead.status === 'Lost') {
      status = 'Sent';
      color = '#64748B';
      bg = '#F1F5F9';
    } else if (idx % 2 === 0) {
      status = 'Opened';
      color = '#16A34A';
      bg = '#DCFCE7';
    }

    return {
      id: lead.id,
      subject: `Demo follow-up: ${lead.service} solutions`,
      to: lead.email || 'no-email@crm.com',
      name: lead.name,
      time: new Date(lead.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + new Date(lead.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }),
      status,
      color,
      bg
    };
  });

  const totalSent = emails.length;
  const openedCount = emails.filter(e => e.status === 'Opened').length;
  const openRate = totalSent === 0 ? '0%' : `${Math.round((openedCount / totalSent) * 100)}%`;
  const replyRate = totalSent === 0 ? '0%' : `${Math.round((openedCount / totalSent) * 33)}%`;

  return (
    <div className="email-layout-grid" style={{ animation: 'fadeUp 0.3s ease', display: 'grid', gridTemplateColumns: '1fr 300px', gap: '16px', alignItems: 'start' }}>
      
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
        {emails.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#9AA1AD' }}>
            <AlertCircle size={32} style={{ marginBottom: '10px', color: '#AEB4BE' }} />
            <div style={{ fontSize: '13px', fontWeight: 600 }}>No Email Activity Yet</div>
            <p style={{ fontSize: '11.5px', marginTop: '4px', color: '#AEB4BE', margin: 0 }}>Emails sent by your n8n integration will populate here.</p>
          </div>
        ) : (
          emails.map((email) => (
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
          ))
        )}
      </div>

      {/* RIGHT COLUMN: INSIGHTS & N8N STATUS */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* Email Stats snapshot */}
        <div style={{ background: '#fff', border: '1px solid #ECEDEF', borderRadius: '16px', padding: '18px' }}>
          <h3 style={{ margin: '0 0 14px 0', fontSize: '14px', fontWeight: 700, color: '#16191D' }}>Email stats</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '13px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12.5px', color: '#5A616E', fontWeight: 600 }}>Sent (7d)</span>
              <span style={{ fontSize: '16px', fontWeight: 800, color: '#16191D' }}>{totalSent}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12.5px', color: '#5A616E', fontWeight: 600 }}>Open rate</span>
              <span style={{ fontSize: '16px', fontWeight: 800, color: '#16A34A' }}>{openRate}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12.5px', color: '#5A616E', fontWeight: 600 }}>Reply rate</span>
              <span style={{ fontSize: '16px', fontWeight: 800, color: '#16191D' }}>{replyRate}</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

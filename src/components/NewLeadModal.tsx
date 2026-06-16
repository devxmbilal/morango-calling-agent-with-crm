'use client';

import React, { useState } from 'react';
import { Lead } from '@/lib/db';
import { X, User, Phone, Mail, Briefcase, DollarSign, Calendar } from 'lucide-react';

interface NewLeadModalProps {
  onClose: () => void;
  onSubmit: (leadData: Omit<Lead, 'id' | 'created_at' | 'meetings' | 'notes'>, meetingDate?: string) => Promise<void>;
  defaultStatus?: Lead['status'];
}

export default function NewLeadModal({ onClose, onSubmit, defaultStatus = 'New Lead' }: NewLeadModalProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [service, setService] = useState<Lead['service']>('AI Agent');
  const [budget, setBudget] = useState('');
  const [meetingDate, setMeetingDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !phone) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        name,
        phone,
        email,
        company: company || undefined,
        service,
        budget: budget || undefined,
        source: 'Manual Input',
        status: defaultStatus
      }, meetingDate || undefined);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

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
      <div 
        className="glass-panel" 
        style={{
          width: '100%',
          maxWidth: '550px',
          padding: '24px',
          background: '#FFFFFF',
          border: '1px solid #EBECEF',
          boxShadow: '0 20px 48px rgba(22, 25, 29, 0.08)',
          animation: 'fadeUp 0.3s ease forwards'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#16191D', letterSpacing: '-0.2px' }}>Create New Lead</h3>
          <button
            onClick={onClose}
            style={{
              background: '#FAFBFC',
              border: '1px solid #EBECEF',
              color: '#9AA1AD',
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'var(--transition-smooth)'
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Name */}
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#5A616E', display: 'block', marginBottom: '6px' }}>
              Client Name *
            </label>
            <div style={{ position: 'relative' }}>
              <User size={15} color="#9AA1AD" style={{ position: 'absolute', left: '12px', top: '14px' }} />
              <input
                type="text"
                placeholder="Ahmed Ali"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ paddingLeft: '40px' }}
                required
              />
            </div>
          </div>

          {/* Contact Details (Phone & Email) */}
          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#5A616E', display: 'block', marginBottom: '6px' }}>
                Phone Number *
              </label>
              <div style={{ position: 'relative' }}>
                <Phone size={15} color="#9AA1AD" style={{ position: 'absolute', left: '12px', top: '14px' }} />
                <input
                  type="tel"
                  placeholder="+92 300 1234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  style={{ paddingLeft: '40px' }}
                  required
                />
              </div>
            </div>
            
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#5A616E', display: 'block', marginBottom: '6px' }}>
                Email Address *
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={15} color="#9AA1AD" style={{ position: 'absolute', left: '12px', top: '14px' }} />
                <input
                  type="email"
                  placeholder="client@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ paddingLeft: '40px' }}
                  required
                />
              </div>
            </div>
          </div>

          {/* Company & Budget */}
          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#5A616E', display: 'block', marginBottom: '6px' }}>
                Company Name
              </label>
              <div style={{ position: 'relative' }}>
                <Briefcase size={15} color="#9AA1AD" style={{ position: 'absolute', left: '12px', top: '14px' }} />
                <input
                  type="text"
                  placeholder="ABC Ltd"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  style={{ paddingLeft: '40px' }}
                />
              </div>
            </div>

            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#5A616E', display: 'block', marginBottom: '6px' }}>
                Budget Range
              </label>
              <div style={{ position: 'relative' }}>
                <DollarSign size={15} color="#16A34A" style={{ position: 'absolute', left: '12px', top: '14px' }} />
                <input
                  type="text"
                  placeholder="e.g. $1000 - $3000"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  style={{ paddingLeft: '40px' }}
                />
              </div>
            </div>
          </div>

          {/* Service & Meeting date */}
          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#5A616E', display: 'block', marginBottom: '6px' }}>
                Required Service
              </label>
              <select
                value={service}
                onChange={(e) => setService(e.target.value as Lead['service'])}
                style={{ height: '42px' }}
              >
                <option value="AI Agent">AI Agent</option>
                <option value="Web Development">Web Development</option>
                <option value="App Development">App Development</option>
                <option value="DevOps">DevOps</option>
                <option value="AI Automation">AI Automation</option>
              </select>
            </div>

            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#5A616E', display: 'block', marginBottom: '6px' }}>
                Schedule Initial Meeting
              </label>
              <div style={{ position: 'relative' }}>
                <Calendar size={15} color="#9AA1AD" style={{ position: 'absolute', left: '12px', top: '14px' }} />
                <input
                  type="datetime-local"
                  value={meetingDate}
                  onChange={(e) => setMeetingDate(e.target.value)}
                  style={{ paddingLeft: '40px', height: '42px' }}
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

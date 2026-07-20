'use client';

import React, { useState } from 'react';
import { Inquiry } from '@/lib/db';
import { Search, Phone, User, MessageSquare, Clock, Trash2, Info, Headphones } from 'lucide-react';
import InquiryDetailModal from './InquiryDetailModal';

interface InquiriesViewProps {
  inquiries: Inquiry[];
  onDeleteInquiry: (id: string) => void;
}

type FilterStatus = 'All' | 'Completed' | 'Disconnected';

export default function InquiriesView({ inquiries, onDeleteInquiry }: InquiriesViewProps) {
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);
  const [inquiryToDelete, setInquiryToDelete] = useState<Inquiry | null>(null);

  const filtered = inquiries.filter((inq) => {
    const matchesStatus = activeFilter === 'All' || inq.call_status === activeFilter;
    if (!matchesStatus) return false;

    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      inq.name.toLowerCase().includes(query) ||
      inq.phone.includes(query) ||
      (inq.call_summary && inq.call_summary.toLowerCase().includes(query))
    );
  });

  const getCount = (status: FilterStatus) => {
    if (status === 'All') return inquiries.length;
    return inquiries.filter(i => i.call_status === status).length;
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Completed': return { bg: '#DCFCE7', fg: '#16A34A' };
      case 'Disconnected': return { bg: '#FEE2E2', fg: '#DC2626' };
      case 'In Progress': return { bg: '#FEF3C7', fg: '#D97706' };
      default: return { bg: '#F1F2F4', fg: '#5A616E' };
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleDelete = (id: string) => {
    onDeleteInquiry(id);
    setSelectedInquiry(null);
  };

  const filters: FilterStatus[] = ['All', 'Completed', 'Disconnected'];

  return (
    <div style={{ animation: 'fadeUp 0.3s ease' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#16191D', letterSpacing: '-0.3px' }}>
            Information Inquiries
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#9AA1AD', fontWeight: 500 }}>
            Calls from people who contacted for information only
          </p>
        </div>
      </div>

      {/* Filters & Search */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px', flexWrap: 'wrap' }}>
        {/* Status Filter Pills */}
        <div style={{ display: 'flex', gap: '6px' }}>
          {filters.map(f => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              style={{
                padding: '7px 14px',
                borderRadius: '20px',
                border: activeFilter === f ? '1.5px solid #E8483D' : '1px solid #EBECEF',
                background: activeFilter === f ? '#FDEBE9' : '#fff',
                color: activeFilter === f ? '#E8483D' : '#5A616E',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              {f}
              <span style={{
                background: activeFilter === f ? '#E8483D' : '#EBECEF',
                color: activeFilter === f ? '#fff' : '#5A616E',
                padding: '1px 7px',
                borderRadius: '10px',
                fontSize: '11px',
                fontWeight: 700,
              }}>
                {getCount(f)}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div style={{ position: 'relative', flex: 1, maxWidth: '320px', marginLeft: 'auto' }}>
          <Search size={15} color="#9AA1AD" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search inquiries..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 12px 9px 36px',
              borderRadius: '10px',
              border: '1px solid #EBECEF',
              fontSize: '13px',
              color: '#16191D',
              outline: 'none',
              background: '#FAFBFC',
              transition: 'border-color 0.2s ease',
            }}
            onFocus={(e) => e.currentTarget.style.borderColor = '#E8483D'}
            onBlur={(e) => e.currentTarget.style.borderColor = '#EBECEF'}
          />
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          background: '#FAFBFC',
          borderRadius: '16px',
          border: '1px solid #EBECEF',
        }}>
          <Info size={40} color="#D1D5DB" style={{ marginBottom: '12px' }} />
          <h3 style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: 700, color: '#9AA1AD' }}>
            No inquiries found
          </h3>
          <p style={{ margin: 0, fontSize: '13px', color: '#B8BFC9' }}>
            {searchQuery ? 'Try adjusting your search or filters' : 'Information-only call data will appear here'}
          </p>
        </div>
      ) : (
        <div style={{
          background: '#fff',
          borderRadius: '16px',
          border: '1px solid #EBECEF',
          overflow: 'hidden',
        }}>
          {/* Table Header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 160px 1.2fr 90px 110px 100px 50px',
            padding: '12px 20px',
            background: '#FAFBFC',
            borderBottom: '1px solid #EBECEF',
            gap: '12px',
          }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#9AA1AD', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Name</span>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#9AA1AD', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Phone</span>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#9AA1AD', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Summary</span>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#9AA1AD', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Recording</span>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#9AA1AD', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Status</span>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#9AA1AD', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Date</span>
            <span></span>
          </div>

          {/* Table Rows */}
          {filtered.map((inq, index) => {
            const sStyle = getStatusStyle(inq.call_status);
            return (
              <div
                key={inq.id}
                onClick={() => setSelectedInquiry(inq)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 160px 1.2fr 90px 110px 100px 50px',
                  padding: '14px 20px',
                  borderBottom: index < filtered.length - 1 ? '1px solid #F3F4F6' : 'none',
                  cursor: 'pointer',
                  transition: 'background 0.15s ease',
                  gap: '12px',
                  alignItems: 'center',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#FAFBFC'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                {/* Name */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                  <div style={{
                    width: '34px', height: '34px', borderRadius: '10px',
                    background: 'linear-gradient(135deg, #8B5CF6, #A78BFA)',
                    color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: '12px', flexShrink: 0,
                  }}>
                    {getInitials(inq.name)}
                  </div>
                  <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#16191D', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {inq.name}
                  </span>
                </div>

                {/* Phone */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                  <Phone size={13} color="#9AA1AD" />
                  <span style={{ fontSize: '13px', color: '#5A616E', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {inq.phone}
                  </span>
                </div>

                {/* Summary */}
                <div style={{ minWidth: 0 }}>
                  <span style={{ fontSize: '13px', color: '#5A616E', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                    {inq.call_summary || '—'}
                  </span>
                </div>

                {/* Recording */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {inq.recording_url ? (
                    <span style={{
                      display: 'flex', alignItems: 'center', gap: '4px',
                      fontSize: '11px', fontWeight: 600, color: '#16A34A',
                      background: '#DCFCE7', padding: '4px 10px', borderRadius: '20px',
                    }}>
                      <Headphones size={12} /> Available
                    </span>
                  ) : (
                    <span style={{ fontSize: '11px', color: '#D1D5DB', fontWeight: 500 }}>—</span>
                  )}
                </div>

                {/* Status */}
                <span style={{
                  fontSize: '11.5px',
                  fontWeight: 600,
                  padding: '4px 10px',
                  borderRadius: '20px',
                  background: sStyle.bg,
                  color: sStyle.fg,
                  textAlign: 'center',
                  width: 'fit-content',
                }}>
                  {inq.call_status}
                </span>

                {/* Date */}
                <span style={{ fontSize: '12px', color: '#9AA1AD', fontWeight: 500 }}>
                  {formatDate(inq.created_at)}
                </span>

                {/* Delete */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setInquiryToDelete(inq);
                  }}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    padding: '6px', borderRadius: '8px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    opacity: 0.4, transition: 'opacity 0.2s ease',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '0.4'}
                >
                  <Trash2 size={14} color="#DC2626" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      {selectedInquiry && (
        <InquiryDetailModal
          inquiry={selectedInquiry}
          onClose={() => setSelectedInquiry(null)}
          onDelete={handleDelete}
        />
      )}

      {/* Custom Delete Confirmation Overlay */}
      {inquiryToDelete && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(22, 25, 29, 0.45)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000,
          animation: 'fadeIn 0.2s ease',
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            padding: '24px',
            width: '360px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            textAlign: 'center',
            border: '1px solid #ECEDEF',
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: '#FDEBE9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px'
            }}>
              <Trash2 size={22} color="#E8483D" />
            </div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '16px', fontWeight: 800, color: '#16191D' }}>Delete Inquiry</h3>
            <p style={{ margin: '0 0 20px 0', fontSize: '13px', color: '#5A616E', lineHeight: 1.5, fontWeight: 500 }}>
              Are you sure you want to delete the inquiry from <strong>{inquiryToDelete.name}</strong>? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setInquiryToDelete(null)}
                style={{
                  flex: 1,
                  padding: '10px 0',
                  borderRadius: '10px',
                  border: '1px solid #EBECEF',
                  background: '#FFFFFF',
                  color: '#5A616E',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background 0.2s ease',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  handleDelete(inquiryToDelete.id);
                  setInquiryToDelete(null);
                }}
                style={{
                  flex: 1,
                  padding: '10px 0',
                  borderRadius: '10px',
                  border: 'none',
                  background: '#E8483D',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background 0.2s ease',
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Inquiry } from '@/lib/db';
import { X, Phone, User, FileText, Clock, Headphones, MessageSquare, Trash2, Copy, CheckCircle } from 'lucide-react';

interface InquiryDetailModalProps {
  inquiry: Inquiry;
  onClose: () => void;
  onDelete: (id: string) => void;
}

export default function InquiryDetailModal({ inquiry, onClose, onDelete }: InquiryDetailModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [copiedField, setCopiedField] = useState('');
  const [activeDetailTab, setActiveDetailTab] = useState<'overview' | 'transcript'>('overview');
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(''), 2000);
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(inquiry.id);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'Completed': return { bg: '#DCFCE7', fg: '#16A34A' };
      case 'Disconnected': return { bg: '#FEE2E2', fg: '#DC2626' };
      case 'In Progress': return { bg: '#FEF3C7', fg: '#D97706' };
      default: return { bg: '#F1F2F4', fg: '#5A616E' };
    }
  };

  const statusStyle = getStatusStyle(inquiry.call_status);
  const createdDate = new Date(inquiry.created_at);

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.45)',
        backdropFilter: 'blur(4px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        animation: 'fadeIn 0.2s ease',
      }}
    >
      <div style={{
        background: '#fff',
        borderRadius: '20px',
        width: '640px',
        maxHeight: '85vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
        animation: 'fadeUp 0.25s ease',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #EBECEF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '44px', height: '44px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #8B5CF6, #A78BFA)',
              color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: '15px',
            }}>
              {inquiry.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#16191D' }}>
                {inquiry.name}
              </h2>
              <span style={{
                fontSize: '12px',
                padding: '2px 10px',
                borderRadius: '20px',
                background: statusStyle.bg,
                color: statusStyle.fg,
                fontWeight: 600,
              }}>
                {inquiry.call_status}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '6px', borderRadius: '8px',
            }}
          >
            <X size={20} color="#9AA1AD" />
          </button>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex', gap: '0', borderBottom: '1px solid #EBECEF',
          padding: '0 24px',
        }}>
          {(['overview', 'transcript'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveDetailTab(tab)}
              style={{
                padding: '12px 18px',
                fontSize: '13px',
                fontWeight: 600,
                color: activeDetailTab === tab ? '#E8483D' : '#9AA1AD',
                background: 'none',
                border: 'none',
                borderBottom: activeDetailTab === tab ? '2px solid #E8483D' : '2px solid transparent',
                cursor: 'pointer',
                textTransform: 'capitalize',
                transition: 'all 0.2s ease',
              }}
            >
              {tab === 'overview' ? 'Overview' : 'Transcript & Recording'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {activeDetailTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Contact Info */}
              <div style={{
                background: '#FAFBFC', borderRadius: '14px', padding: '18px',
                border: '1px solid #EBECEF',
              }}>
                <h3 style={{ margin: '0 0 14px', fontSize: '13px', fontWeight: 700, color: '#9AA1AD', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Contact Information
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <User size={15} color="#9AA1AD" />
                      <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#16191D' }}>{inquiry.name}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Phone size={15} color="#9AA1AD" />
                      <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#16191D' }}>{inquiry.phone}</span>
                    </div>
                    <button
                      onClick={() => handleCopy(inquiry.phone, 'phone')}
                      style={{
                        background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
                        display: 'flex', alignItems: 'center', gap: '4px',
                        fontSize: '11px', color: copiedField === 'phone' ? '#16A34A' : '#9AA1AD',
                        fontWeight: 600,
                      }}
                    >
                      {copiedField === 'phone' ? <><CheckCircle size={13} /> Copied</> : <><Copy size={13} /> Copy</>}
                    </button>
                  </div>
                </div>
              </div>

              {/* Call Summary */}
              {inquiry.call_summary && (
                <div style={{
                  background: '#FAFBFC', borderRadius: '14px', padding: '18px',
                  border: '1px solid #EBECEF',
                }}>
                  <h3 style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: 700, color: '#9AA1AD', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Call Summary
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <MessageSquare size={15} color="#9AA1AD" style={{ marginTop: '2px', flexShrink: 0 }} />
                    <p style={{ margin: 0, fontSize: '13.5px', color: '#16191D', lineHeight: 1.6 }}>
                      {inquiry.call_summary}
                    </p>
                  </div>
                </div>
              )}

              {/* Meta Info */}
              <div style={{
                background: '#FAFBFC', borderRadius: '14px', padding: '18px',
                border: '1px solid #EBECEF',
              }}>
                <h3 style={{ margin: '0 0 14px', fontSize: '13px', fontWeight: 700, color: '#9AA1AD', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Call Details
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Clock size={15} color="#9AA1AD" />
                    <span style={{ fontSize: '13px', color: '#5A616E' }}>
                      {createdDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at {createdDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Delete Button */}
              <button
                onClick={() => setShowDeleteConfirm(true)}
                disabled={isDeleting}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                  padding: '12px',
                  borderRadius: '12px',
                  border: '1px solid #FEE2E2',
                  background: '#FFF5F5',
                  color: '#DC2626',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  opacity: isDeleting ? 0.6 : 1,
                  transition: 'all 0.2s ease',
                }}
              >
                <Trash2 size={15} />
                {isDeleting ? 'Deleting...' : 'Delete Inquiry'}
              </button>
            </div>
          )}

          {activeDetailTab === 'transcript' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Recording */}
              {inquiry.recording_url && (
                <div style={{
                  background: '#FAFBFC', borderRadius: '14px', padding: '18px',
                  border: '1px solid #EBECEF',
                }}>
                  <h3 style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 700, color: '#9AA1AD', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Headphones size={14} /> Call Recording
                  </h3>
                  <audio
                    src={inquiry.recording_url}
                    controls
                    style={{ width: '100%', borderRadius: '8px', outline: 'none' }}
                  />
                </div>
              )}

              {/* Transcript */}
              <div style={{
                background: '#FAFBFC', borderRadius: '14px', padding: '18px',
                border: '1px solid #EBECEF',
              }}>
                <h3 style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 700, color: '#9AA1AD', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FileText size={14} /> Call Transcript
                </h3>
                {inquiry.transcript ? (
                  <pre style={{
                    margin: 0,
                    fontSize: '13px',
                    lineHeight: 1.7,
                    color: '#16191D',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    fontFamily: 'inherit',
                    maxHeight: '350px',
                    overflowY: 'auto',
                  }}>
                    {inquiry.transcript}
                  </pre>
                ) : (
                  <p style={{ margin: 0, fontSize: '13px', color: '#9AA1AD', fontStyle: 'italic' }}>
                    No transcript available for this call.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Custom Delete Confirmation Overlay */}
      {showDeleteConfirm && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(22, 25, 29, 0.45)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10001,
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
              Are you sure you want to delete this inquiry? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
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
                onClick={confirmDelete}
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

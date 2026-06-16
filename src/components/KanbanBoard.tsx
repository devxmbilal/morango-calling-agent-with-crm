'use client';

import React, { useState } from 'react';
import { Lead } from '@/lib/db';
import LeadCard from './LeadCard';
import { Plus } from 'lucide-react';

interface KanbanBoardProps {
  leads: Lead[];
  onSelectLead: (lead: Lead) => void;
  onMoveLead: (leadId: string, targetStatus: Lead['status']) => void;
  onAddLeadClick: (status: Lead['status']) => void;
}

const COLUMNS: { name: Lead['status']; color: string }[] = [
  { name: 'New Lead', color: '#2563EB' },
  { name: 'Contacted', color: '#8b5cf6' },
  { name: 'Qualified', color: '#D97706' },
  { name: 'Proposal Sent', color: '#4F46E5' },
  { name: 'Negotiation', color: '#f59e0b' },
  { name: 'Won', color: '#16A34A' },
  { name: 'Lost', color: '#64748B' },
];

export default function KanbanBoard({ leads, onSelectLead, onMoveLead, onAddLeadClick }: KanbanBoardProps) {
  const [activeOverColumn, setActiveOverColumn] = useState<string | null>(null);

  const handleDragOver = (e: React.DragEvent, columnName: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (activeOverColumn !== columnName) {
      setActiveOverColumn(columnName);
    }
  };

  const handleDragLeave = () => {
    setActiveOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, targetStatus: Lead['status']) => {
    e.preventDefault();
    setActiveOverColumn(null);
    const leadId = e.dataTransfer.getData('text/plain');
    if (leadId) {
      onMoveLead(leadId, targetStatus);
    }
  };

  const getLeadsByStatus = (status: Lead['status']) => {
    return leads.filter((lead) => lead.status === status);
  };

  return (
    <div style={{
      display: 'flex',
      gap: '16px',
      overflowX: 'auto',
      height: '100%',
      paddingBottom: '16px',
      alignItems: 'flex-start',
    }}>
      {COLUMNS.map((col) => {
        const colLeads = getLeadsByStatus(col.name);
        const isDragOver = activeOverColumn === col.name;

        return (
          <div
            key={col.name}
            onDragOver={(e) => handleDragOver(e, col.name)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, col.name)}
            style={{
              width: '280px',
              flexShrink: 0,
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '100%',
              borderRadius: '16px',
              background: isDragOver ? 'rgba(232, 72, 61, 0.02)' : 'rgba(255, 255, 255, 0.6)',
              border: isDragOver ? '1px dashed #E8483D' : '1px solid #EBECEF',
              padding: '14px',
              transition: 'var(--transition-smooth)'
            }}
          >
            {/* Column Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px',
              paddingBottom: '8px',
              borderBottom: '1px solid #F1F2F4'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: col.color,
                  boxShadow: `0 0 0 3px ${col.color}20`
                }} />
                <h3 style={{ fontSize: '0.85rem', fontWeight: 800, color: '#16191D', whiteSpace: 'nowrap' }}>
                  {col.name}
                </h3>
                <span style={{
                  fontSize: '0.75rem',
                  color: '#5A616E',
                  background: '#F1F2F4',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  fontWeight: 700
                }}>
                  {colLeads.length}
                </span>
              </div>
              
              {/* Add Lead in this column button */}
              <button
                onClick={() => onAddLeadClick(col.name)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#9AA1AD',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '6px',
                  padding: '4px',
                  transition: 'var(--transition-smooth)'
                }}
                className="hover-btn"
              >
                <Plus size={15} />
              </button>
            </div>

            {/* Column Cards Wrapper */}
            <div style={{
              overflowY: 'auto',
              flexGrow: 1,
              minHeight: '200px',
              paddingRight: '4px'
            }}>
              {colLeads.length === 0 ? (
                <div style={{
                  height: '100px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px dashed #EBECEF',
                  borderRadius: '8px',
                  fontSize: '0.75rem',
                  color: '#9AA1AD',
                  textAlign: 'center',
                  userSelect: 'none'
                }}>
                  No leads yet
                </div>
              ) : (
                colLeads.map((lead) => (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    onSelect={onSelectLead}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

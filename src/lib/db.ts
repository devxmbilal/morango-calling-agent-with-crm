import { supabase, isSupabaseConfigured } from './supabase';

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string;
  company?: string;
  service: 'AI Agent' | 'Web Development' | 'App Development' | 'DevOps' | 'AI Automation';
  budget?: string;
  source: string;
  status: 'New Lead' | 'Contacted' | 'Qualified' | 'Proposal Sent' | 'Negotiation' | 'Won' | 'Lost';
  vapi_call_id?: string;
  transcript?: string;
  recording_url?: string;
  created_at: string;
  meetings?: Meeting[];
  notes?: Note[];
}

export interface Meeting {
  id: string;
  lead_id: string;
  meeting_date: string;
  meeting_link?: string;
  status: 'Scheduled' | 'Completed' | 'Cancelled';
  created_at: string;
}

export interface Note {
  id: string;
  lead_id: string;
  note: string;
  created_at: string;
}

// Seed mock data for local storage demo mode
const MOCK_LEADS: Lead[] = [];

// Browser Local Storage helper
const getLocalData = (): Lead[] => {
  if (typeof window === 'undefined') return MOCK_LEADS;
  const data = localStorage.getItem('morango_crm_leads');
  if (!data) {
    localStorage.setItem('morango_crm_leads', JSON.stringify(MOCK_LEADS));
    return MOCK_LEADS;
  }
  return JSON.parse(data);
};

const setLocalData = (leads: Lead[]) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('morango_crm_leads', JSON.stringify(leads));
  }
};

export const dbService = {
  isDemoMode: !isSupabaseConfigured,

  async getLeads(): Promise<Lead[]> {
    if (this.isDemoMode) {
      return getLocalData();
    }

    try {
      const { data: leads, error: leadsError } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (leadsError) throw leadsError;

      // Fetch meetings and notes for each lead
      const leadsWithRelations = await Promise.all(
        (leads || []).map(async (lead) => {
          const { data: meetings } = await supabase
            .from('meetings')
            .select('*')
            .eq('lead_id', lead.id);

          const { data: notes } = await supabase
            .from('notes')
            .select('*')
            .eq('lead_id', lead.id)
            .order('created_at', { ascending: false });

          return {
            ...lead,
            meetings: meetings || [],
            notes: notes || [],
          };
        })
      );

      return leadsWithRelations as Lead[];
    } catch (err) {
      console.error('Supabase fetch error, falling back to mock data:', err);
      // Fallback to local storage if query fails
      return getLocalData();
    }
  },

  async updateLeadStatus(id: string, status: Lead['status']): Promise<boolean> {
    if (this.isDemoMode) {
      const leads = getLocalData();
      const updated = leads.map((l) => (l.id === id ? { ...l, status } : l));
      setLocalData(updated);
      return true;
    }

    const { error } = await supabase
      .from('leads')
      .update({ status })
      .eq('id', id);

    return !error;
  },

  async createLead(leadData: Omit<Lead, 'id' | 'created_at' | 'meetings' | 'notes'>): Promise<Lead> {
    if (this.isDemoMode) {
      const leads = getLocalData();
      const newLead: Lead = {
        ...leadData,
        id: `lead-${Math.random().toString(36).substr(2, 9)}`,
        created_at: new Date().toISOString(),
        meetings: [],
        notes: [],
      };
      setLocalData([newLead, ...leads]);
      return newLead;
    }

    const { data, error } = await supabase
      .from('leads')
      .insert([leadData])
      .select()
      .single();

    if (error) throw error;
    return { ...data, meetings: [], notes: [] } as Lead;
  },

  async addNote(leadId: string, noteText: string): Promise<Note> {
    if (this.isDemoMode) {
      const leads = getLocalData();
      const newNote: Note = {
        id: `note-${Math.random().toString(36).substr(2, 9)}`,
        lead_id: leadId,
        note: noteText,
        created_at: new Date().toISOString(),
      };
      const updated = leads.map((l) => {
        if (l.id === leadId) {
          return {
            ...l,
            notes: [newNote, ...(l.notes || [])],
          };
        }
        return l;
      });
      setLocalData(updated);
      return newNote;
    }

    const { data, error } = await supabase
      .from('notes')
      .insert([{ lead_id: leadId, note: noteText }])
      .select()
      .single();

    if (error) throw error;
    return data as Note;
  },

  async updateNote(noteId: string, leadId: string, noteText: string): Promise<boolean> {
    if (this.isDemoMode) {
      const leads = getLocalData();
      const updated = leads.map((l) => {
        if (l.id === leadId) {
          return {
            ...l,
            notes: (l.notes || []).map((n) => (n.id === noteId ? { ...n, note: noteText } : n)),
          };
        }
        return l;
      });
      setLocalData(updated);
      return true;
    }

    const { error } = await supabase
      .from('notes')
      .update({ note: noteText })
      .eq('id', noteId);

    return !error;
  },

  async deleteNote(noteId: string, leadId: string): Promise<boolean> {
    if (this.isDemoMode) {
      const leads = getLocalData();
      const updated = leads.map((l) => {
        if (l.id === leadId) {
          return {
            ...l,
            notes: (l.notes || []).filter((n) => n.id !== noteId),
          };
        }
        return l;
      });
      setLocalData(updated);
      return true;
    }

    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', noteId);

    return !error;
  },

  async addMeeting(leadId: string, meetingDate: string, meetingLink?: string): Promise<Meeting> {
    if (this.isDemoMode) {
      const leads = getLocalData();
      const newMeeting: Meeting = {
        id: `meet-${Math.random().toString(36).substr(2, 9)}`,
        lead_id: leadId,
        meeting_date: meetingDate,
        meeting_link: meetingLink || 'https://meet.google.com/mock-link',
        status: 'Scheduled',
        created_at: new Date().toISOString(),
      };
      const updated = leads.map((l) => {
        if (l.id === leadId) {
          return {
            ...l,
            meetings: [...(l.meetings || []), newMeeting],
          };
        }
        return l;
      });
      setLocalData(updated);
      return newMeeting;
    }

    const { data, error } = await supabase
      .from('meetings')
      .insert([
        {
          lead_id: leadId,
          meeting_date: meetingDate,
          meeting_link: meetingLink,
          status: 'Scheduled',
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return data as Meeting;
  },

  async deleteLead(id: string): Promise<boolean> {
    if (this.isDemoMode) {
      const leads = getLocalData();
      const filtered = leads.filter((l) => l.id !== id);
      setLocalData(filtered);
      return true;
    }

    const { error } = await supabase.from('leads').delete().eq('id', id);
    return !error;
  }
};

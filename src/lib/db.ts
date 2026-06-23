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

const MOCK_LEADS: Lead[] = [];

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

async function apiRequest<T = any>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Request failed');
  }
  return data;
}

async function resolveDemoMode(): Promise<boolean> {
  if (typeof window === 'undefined') return true;
  try {
    const data = await apiRequest<{ isDemoMode: boolean }>('/api/crm/status');
    return data.isDemoMode;
  } catch {
    return true;
  }
}

export const dbService = {
  isDemoMode: true,

  async getLeads(): Promise<Lead[]> {
    const isDemo = await resolveDemoMode();
    this.isDemoMode = isDemo;

    if (isDemo) {
      return getLocalData();
    }

    try {
      const data = await apiRequest<{ leads: Lead[]; isDemoMode: boolean }>('/api/crm/leads');
      this.isDemoMode = data.isDemoMode;
      return data.leads;
    } catch (err) {
      console.error('API fetch error, falling back to mock data:', err);
      this.isDemoMode = true;
      return getLocalData();
    }
  },

  async updateLeadStatus(id: string, status: Lead['status']): Promise<boolean> {
    if (this.isDemoMode) {
      const leads = getLocalData();
      setLocalData(leads.map(l => (l.id === id ? { ...l, status } : l)));
      return true;
    }

    const data = await apiRequest<{ success: boolean }>('/api/crm/leads', {
      method: 'PATCH',
      body: JSON.stringify({ id, status }),
    });
    return data.success;
  },

  async updateLead(id: string, updatedFields: Partial<Lead>): Promise<boolean> {
    if (this.isDemoMode) {
      const leads = getLocalData();
      setLocalData(leads.map(l => (l.id === id ? { ...l, ...updatedFields } : l)));
      return true;
    }

    const data = await apiRequest<{ success: boolean }>('/api/crm/leads', {
      method: 'PATCH',
      body: JSON.stringify({ id, ...updatedFields }),
    });
    return data.success;
  },

  async createLead(
    leadData: Omit<Lead, 'id' | 'created_at' | 'meetings' | 'notes'>
  ): Promise<Lead> {
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

    const data = await apiRequest<{ lead: Lead }>('/api/crm/leads', {
      method: 'POST',
      body: JSON.stringify(leadData),
    });
    return data.lead;
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
      setLocalData(
        leads.map(l =>
          l.id === leadId ? { ...l, notes: [newNote, ...(l.notes || [])] } : l
        )
      );
      return newNote;
    }

    const data = await apiRequest<{ note: Note }>('/api/crm/notes', {
      method: 'POST',
      body: JSON.stringify({ leadId, note: noteText }),
    });
    return data.note;
  },

  async updateNote(noteId: string, leadId: string, noteText: string): Promise<boolean> {
    if (this.isDemoMode) {
      const leads = getLocalData();
      setLocalData(
        leads.map(l =>
          l.id === leadId
            ? {
                ...l,
                notes: (l.notes || []).map(n =>
                  n.id === noteId ? { ...n, note: noteText } : n
                ),
              }
            : l
        )
      );
      return true;
    }

    const data = await apiRequest<{ success: boolean }>('/api/crm/notes', {
      method: 'PATCH',
      body: JSON.stringify({ noteId, note: noteText }),
    });
    return data.success;
  },

  async deleteNote(noteId: string, leadId: string): Promise<boolean> {
    if (this.isDemoMode) {
      const leads = getLocalData();
      setLocalData(
        leads.map(l =>
          l.id === leadId
            ? { ...l, notes: (l.notes || []).filter(n => n.id !== noteId) }
            : l
        )
      );
      return true;
    }

    const data = await apiRequest<{ success: boolean }>(
      `/api/crm/notes?noteId=${encodeURIComponent(noteId)}`,
      { method: 'DELETE' }
    );
    return data.success;
  },

  async addMeeting(leadId: string, meetingDate: string, meetingLink?: string): Promise<Meeting> {
    if (this.isDemoMode) {
      const leads = getLocalData();
      let activeLink = meetingLink;

      if (!activeLink) {
        try {
          const res = await fetch('/api/settings');
          if (res.ok) {
            const config = await res.json();
            if (
              config.meeting_link &&
              config.meeting_link !== 'https://calendly.com/morangoai' &&
              config.meeting_link !== 'https://calendly.com/mornagoai'
            ) {
              activeLink = config.meeting_link;
            }
          }
        } catch (e) {
          console.error('Error fetching settings in addMeeting:', e);
        }
      }

      if (
        !activeLink ||
        activeLink.trim() === '' ||
        activeLink === 'https://calendly.com/morangoai' ||
        activeLink === 'https://calendly.com/mornagoai'
      ) {
        throw new Error('No meeting link configured. Please set a meeting link in settings first.');
      }

      const newMeeting: Meeting = {
        id: `meet-${Math.random().toString(36).substr(2, 9)}`,
        lead_id: leadId,
        meeting_date: meetingDate,
        meeting_link: activeLink,
        status: 'Scheduled',
        created_at: new Date().toISOString(),
      };

      setLocalData(
        leads.map(l =>
          l.id === leadId ? { ...l, meetings: [...(l.meetings || []), newMeeting] } : l
        )
      );
      return newMeeting;
    }

    const data = await apiRequest<{ meeting: Meeting }>('/api/crm/meetings', {
      method: 'POST',
      body: JSON.stringify({ leadId, meetingDate, meetingLink }),
    });
    return data.meeting;
  },

  async deleteLead(id: string): Promise<boolean> {
    if (this.isDemoMode) {
      setLocalData(getLocalData().filter(l => l.id !== id));
      return true;
    }

    const data = await apiRequest<{ success: boolean }>(
      `/api/crm/leads?id=${encodeURIComponent(id)}`,
      { method: 'DELETE' }
    );
    return data.success;
  },
};

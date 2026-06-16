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
const MOCK_LEADS: Lead[] = [
  {
    id: 'lead-1',
    name: 'Ahmed Khan',
    phone: '+92 300 1234567',
    email: 'ahmed.khan@realestate.com',
    company: 'Apex Realty Solutions',
    service: 'AI Agent',
    budget: '$1,000 - $3,000',
    source: 'Vapi Call',
    status: 'New Lead',
    vapi_call_id: 'call_9a8b7c6d5e',
    transcript: "Agent: Thank you for calling MorangoAI. My name is Max. How can I help you today?\nClient: Hi Max, I'm Ahmed. I run a real estate agency and we get a lot of incoming inquiries. I was wondering if you guys can build an AI Voice Agent that answers client questions and books appointments on our calendar?\nAgent: Yes, absolutely! We specialize in custom AI Voice Agents built on top of Vapi and integrated with CRMs using n8n. What is your estimate budget for this project?\nClient: We are looking at around $1000 to $3000 to start.\nAgent: Perfect. That fits well. Can I get your email address and company name to lock in the lead?\nClient: Sure, my email is ahmed.khan@realestate.com and my company is Apex Realty Solutions. Let's schedule a deep-dive meeting for June 20th at 3 PM.\nAgent: Excellent, Ahmed. I have logged the details and we'll send a meeting link soon. Have a great day!",
    recording_url: 'https://actions.google.com/sounds/v1/ambiences/morning_birds.ogg', // Standard public test audio
    created_at: new Date(Date.now() - 4 * 3600000).toISOString(),
    meetings: [
      {
        id: 'meet-1',
        lead_id: 'lead-1',
        meeting_date: '2026-06-20T15:00:00.000Z',
        meeting_link: 'https://meet.google.com/abc-defg-hij',
        status: 'Scheduled',
        created_at: new Date(Date.now() - 4 * 3600000).toISOString()
      }
    ],
    notes: [
      {
        id: 'note-1',
        lead_id: 'lead-1',
        note: 'Lead created automatically via Vapi Voice Agent call. Customer interested in Real Estate Voice Agent for booking appointments.',
        created_at: new Date(Date.now() - 4 * 3600000).toISOString()
      }
    ]
  },
  {
    id: 'lead-2',
    name: 'Sarah Jenkins',
    phone: '+1 415 987 6543',
    email: 'sarah@fintechflow.io',
    company: 'FintechFlow Inc',
    service: 'Web Development',
    budget: '$5,000 - $10,000',
    source: 'Vapi Call',
    status: 'Contacted',
    vapi_call_id: 'call_1z2y3x4w5v',
    transcript: "Agent: Hi, thank you for calling MorangoAI. How can I assist you?\nClient: Hello, this is Sarah from FintechFlow. We need a modern, sleek dashboard interface for our new payment tracking module. It should connect to our PostgreSQL backend. Do you handle frontend web development?\nAgent: Yes, we do! We build Next.js applications with premium custom styling. What budget do you have in mind for this?\nClient: We have a budget range of five thousand to ten thousand dollars. We need this delivered within 6 weeks.\nAgent: That is very doable. Let's schedule a call tomorrow morning to go over the design.\nClient: Perfect, my email is sarah@fintechflow.io.",
    recording_url: 'https://actions.google.com/sounds/v1/ambiences/morning_birds.ogg',
    created_at: new Date(Date.now() - 24 * 3600000).toISOString(),
    meetings: [
      {
        id: 'meet-2',
        lead_id: 'lead-2',
        meeting_date: '2026-06-17T10:00:00.000Z',
        meeting_link: 'https://meet.google.com/xyz-pdq-rst',
        status: 'Scheduled',
        created_at: new Date(Date.now() - 24 * 3600000).toISOString()
      }
    ],
    notes: [
      {
        id: 'note-2',
        lead_id: 'lead-2',
        note: 'Customer wants a fast React/Next.js dashboard. Needs high-security standards for financial data. Meeting scheduled to align on wireframes.',
        created_at: new Date(Date.now() - 23 * 3600000).toISOString()
      }
    ]
  },
  {
    id: 'lead-3',
    name: 'Kamran Alvi',
    phone: '+92 321 9876543',
    email: 'kamran@alvisoft.com',
    company: 'AlviSoft',
    service: 'DevOps',
    budget: '$3,000 - $5,000',
    source: 'Manual Input',
    status: 'Qualified',
    created_at: new Date(Date.now() - 2 * 24 * 3600000).toISOString(),
    meetings: [],
    notes: [
      {
        id: 'note-3',
        lead_id: 'lead-3',
        note: 'Manual lead added. AlviSoft needs AWS cloud infrastructure setup with CI/CD pipelines using GitHub Actions.',
        created_at: new Date(Date.now() - 2 * 24 * 3600000).toISOString()
      }
    ]
  }
];

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

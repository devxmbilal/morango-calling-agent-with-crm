import { getSupabaseAdmin, isServerDbConfigured } from './supabase-admin';
import type { Lead, Meeting, Note } from './db';

export { isServerDbConfigured };

export const dbServer = {
  isConfigured: isServerDbConfigured,

  async getLeads(): Promise<Lead[]> {
    const supabase = getSupabaseAdmin();
    const { data: leads, error } = await supabase
      .from('leads')
      .select(`
        *,
        meetings (*),
        notes (*)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (leads || []).map((lead: any) => ({
      ...lead,
      meetings: (lead.meetings || []).sort(
        (a: Meeting, b: Meeting) =>
          new Date(a.meeting_date).getTime() - new Date(b.meeting_date).getTime()
      ),
      notes: (lead.notes || []).sort(
        (a: Note, b: Note) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
    })) as Lead[];
  },

  async updateLeadStatus(id: string, status: Lead['status']): Promise<boolean> {
    const { error } = await getSupabaseAdmin()
      .from('leads')
      .update({ status })
      .eq('id', id);
    return !error;
  },

  async updateLead(id: string, updatedFields: Partial<Lead>): Promise<boolean> {
    const { meetings, notes, id: _id, created_at, ...fields } = updatedFields as Lead;
    const { error } = await getSupabaseAdmin()
      .from('leads')
      .update(fields)
      .eq('id', id);
    return !error;
  },

  async createLead(
    leadData: Omit<Lead, 'id' | 'created_at' | 'meetings' | 'notes'>
  ): Promise<Lead> {
    const { data, error } = await getSupabaseAdmin()
      .from('leads')
      .insert([leadData])
      .select()
      .single();
    if (error) throw error;
    return { ...data, meetings: [], notes: [] } as Lead;
  },

  async addNote(leadId: string, noteText: string): Promise<Note> {
    const { data, error } = await getSupabaseAdmin()
      .from('notes')
      .insert([{ lead_id: leadId, note: noteText }])
      .select()
      .single();
    if (error) throw error;
    return data as Note;
  },

  async updateNote(noteId: string, noteText: string): Promise<boolean> {
    const { error } = await getSupabaseAdmin()
      .from('notes')
      .update({ note: noteText })
      .eq('id', noteId);
    return !error;
  },

  async deleteNote(noteId: string): Promise<boolean> {
    const { error } = await getSupabaseAdmin().from('notes').delete().eq('id', noteId);
    return !error;
  },

  async addMeeting(leadId: string, meetingDate: string, meetingLink?: string): Promise<Meeting> {
    let activeLink = meetingLink;
    if (!activeLink) {
      const { data } = await getSupabaseAdmin()
        .from('system_settings')
        .select('value')
        .eq('key', 'meeting_link')
        .single();
      if (data?.value) activeLink = data.value;
    }

    if (
      !activeLink ||
      activeLink.trim() === '' ||
      activeLink === 'https://calendly.com/morangoai' ||
      activeLink === 'https://calendly.com/mornagoai'
    ) {
      throw new Error('No meeting link configured. Please set a meeting link in settings first.');
    }

    const { data, error } = await getSupabaseAdmin()
      .from('meetings')
      .insert([
        {
          lead_id: leadId,
          meeting_date: meetingDate,
          meeting_link: activeLink,
          status: 'Scheduled',
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return data as Meeting;
  },

  async deleteLead(id: string): Promise<boolean> {
    const { error } = await getSupabaseAdmin().from('leads').delete().eq('id', id);
    return !error;
  },

  async getSetting(key: string): Promise<string | null> {
    const { data } = await getSupabaseAdmin()
      .from('system_settings')
      .select('value')
      .eq('key', key)
      .maybeSingle();
    return data?.value ?? null;
  },

  async getAllSettings(): Promise<Record<string, string>> {
    const { data } = await getSupabaseAdmin().from('system_settings').select('*');
    const map: Record<string, string> = {};
    (data || []).forEach((row: { key: string; value: string }) => {
      map[row.key] = row.value;
    });
    return map;
  },
};

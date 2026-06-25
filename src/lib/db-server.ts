import prisma from './prisma';
import type { Lead, Meeting, Note } from './db';
import { isPlaceholderMeetingLink } from './meeting-link';

export const isServerDbConfigured = !!process.env.DATABASE_URL && process.env.DATABASE_URL.trim() !== '';

export const dbServer = {
  isConfigured: isServerDbConfigured,

  async getLeads(): Promise<Lead[]> {
    if (!isServerDbConfigured) {
      throw new Error('Database is not configured.');
    }

    const leads = await prisma.lead.findMany({
      include: {
        meetings: true,
        notes: true,
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    return leads.map((lead: any) => ({
      ...lead,
      created_at: lead.created_at.toISOString(),
      meetings: (lead.meetings || [])
        .map((m: any) => ({
          ...m,
          created_at: m.created_at.toISOString(),
          meeting_date: m.meeting_date.toISOString(),
        }))
        .sort((a: any, b: any) => new Date(a.meeting_date).getTime() - new Date(b.meeting_date).getTime()),
      notes: (lead.notes || [])
        .map((n: any) => ({
          ...n,
          created_at: n.created_at.toISOString(),
        }))
        .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    })) as any[] as Lead[];
  },

  async updateLeadStatus(id: string, status: Lead['status']): Promise<boolean> {
    if (!isServerDbConfigured) return false;
    try {
      await prisma.lead.update({
        where: { id },
        data: { status },
      });
      return true;
    } catch (err) {
      console.error('Prisma updateLeadStatus error:', err);
      return false;
    }
  },

  async updateLead(id: string, updatedFields: Partial<Lead>): Promise<boolean> {
    if (!isServerDbConfigured) return false;
    const { meetings, notes, id: _id, created_at, ...fields } = updatedFields as Lead;
    try {
      await prisma.lead.update({
        where: { id },
        data: fields as any,
      });
      return true;
    } catch (err) {
      console.error('Prisma updateLead error:', err);
      return false;
    }
  },

  async createLead(
    leadData: Omit<Lead, 'id' | 'created_at' | 'meetings' | 'notes'>
  ): Promise<Lead> {
    if (!isServerDbConfigured) {
      throw new Error('Database is not configured.');
    }
    const data = await prisma.lead.create({
      data: leadData as any,
    });
    return {
      ...data,
      created_at: data.created_at.toISOString(),
      meetings: [],
      notes: [],
    } as any as Lead;
  },

  async addNote(leadId: string, noteText: string): Promise<Note> {
    if (!isServerDbConfigured) {
      throw new Error('Database is not configured.');
    }
    const data = await prisma.note.create({
      data: {
        lead_id: leadId,
        note: noteText,
      },
    });
    return {
      ...data,
      created_at: data.created_at.toISOString(),
    } as any as Note;
  },

  async updateNote(noteId: string, noteText: string): Promise<boolean> {
    if (!isServerDbConfigured) return false;
    try {
      await prisma.note.update({
        where: { id: noteId },
        data: { note: noteText },
      });
      return true;
    } catch (err) {
      console.error('Prisma updateNote error:', err);
      return false;
    }
  },

  async deleteNote(noteId: string): Promise<boolean> {
    if (!isServerDbConfigured) return false;
    try {
      await prisma.note.delete({
        where: { id: noteId },
      });
      return true;
    } catch (err) {
      console.error('Prisma deleteNote error:', err);
      return false;
    }
  },

  async addMeeting(leadId: string, meetingDate: string, meetingLink?: string): Promise<Meeting> {
    if (!isServerDbConfigured) {
      throw new Error('Database is not configured.');
    }

    let activeLink = meetingLink;
    if (!activeLink) {
      const setting = await prisma.systemSetting.findUnique({
        where: { key: 'meeting_link' },
      });
      if (setting?.value) activeLink = setting.value;
    }

    if (isPlaceholderMeetingLink(activeLink)) {
      throw new Error('No meeting link configured. Please set a meeting link in settings first.');
    }

    const data = await prisma.meeting.create({
      data: {
        lead_id: leadId,
        meeting_date: new Date(meetingDate),
        meeting_link: activeLink,
        status: 'Scheduled',
      },
    });

    return {
      ...data,
      created_at: data.created_at.toISOString(),
      meeting_date: data.meeting_date.toISOString(),
    } as any as Meeting;
  },

  async deleteLead(id: string): Promise<boolean> {
    if (!isServerDbConfigured) return false;
    try {
      await prisma.lead.delete({
        where: { id },
      });
      return true;
    } catch (err) {
      console.error('Prisma deleteLead error:', err);
      return false;
    }
  },

  async getSetting(key: string): Promise<string | null> {
    if (!isServerDbConfigured) return null;
    const setting = await prisma.systemSetting.findUnique({
      where: { key },
    });
    return setting?.value ?? null;
  },

  async getAllSettings(): Promise<Record<string, string>> {
    if (!isServerDbConfigured) return {};
    const settings = await prisma.systemSetting.findMany();
    const map: Record<string, string> = {};
    settings.forEach((row: any) => {
      map[row.key] = row.value;
    });
    return map;
  },
};

/** Returns the configured timezone from DB, falling back to Asia/Dubai */
export async function getTimezone(): Promise<string> {
  try {
    const tz = await dbServer.getSetting('timezone');
    if (tz && tz.trim()) return tz.trim();
  } catch {}
  return 'Asia/Dubai';
}

/**
 * Returns the UTC offset string (e.g. "+04:00", "+05:30") for a given IANA timezone.
 * Used to append to bare datetime strings from Vapi.
 */
export function getTimezoneOffsetString(timezone: string): string {
  try {
    const now = new Date();
    const utcMs = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' })).getTime();
    const tzMs  = new Date(now.toLocaleString('en-US', { timeZone: timezone })).getTime();
    const diffMins = Math.round((tzMs - utcMs) / 60000);
    const sign = diffMins >= 0 ? '+' : '-';
    const abs = Math.abs(diffMins);
    const h = String(Math.floor(abs / 60)).padStart(2, '0');
    const m = String(abs % 60).padStart(2, '0');
    return `${sign}${h}:${m}`;
  } catch {
    return '+04:00';
  }
}

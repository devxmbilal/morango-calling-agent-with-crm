const PLACEHOLDER_MEETING_LINKS = [
  'https://calendly.com/morangoai',
  'https://calendly.com/mornagoai', // legacy typo kept for backward compat
];

export function isPlaceholderMeetingLink(url: string | null | undefined): boolean {
  if (!url || url.trim() === '') return true;
  return PLACEHOLDER_MEETING_LINKS.includes(url.trim());
}

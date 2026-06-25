const PLACEHOLDER_MEETING_LINKS = [
  'https://calendly.com/morangoai',
];

export function isPlaceholderMeetingLink(url: string | null | undefined): boolean {
  if (!url || url.trim() === '') return true;
  return PLACEHOLDER_MEETING_LINKS.includes(url.trim());
}

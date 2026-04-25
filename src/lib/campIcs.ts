// Generate an .ics calendar file for a camp event.
// RN port of Lovable web src/lib/campIcs.ts. Pure logic for buildCampIcs;
// downloadCampIcs writes the .ics to the cache directory and triggers the
// native share sheet via expo-sharing (the iOS/Android share sheet exposes
// "Add to Calendar" via Apple Calendar / Google Calendar / Outlook).

import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

interface IcsCamp {
  id: string;
  name: string;
  description?: string | null;
  location?: string | null;
  city?: string | null;
  state?: string | null;
  start_date: string; // YYYY-MM-DD
  end_date?: string | null;
  start_time?: string | null; // HH:mm
  end_time?: string | null;
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function formatIcsDate(d: Date): string {
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

function escapeIcs(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

export function buildCampIcs(camp: IcsCamp): string {
  const startDateStr = camp.start_date;
  const endDateStr = camp.end_date ?? camp.start_date;
  const startTime = camp.start_time ?? '09:00';
  const endTime = camp.end_time ?? '17:00';

  const start = new Date(`${startDateStr}T${startTime}:00`);
  const end = new Date(`${endDateStr}T${endTime}:00`);
  if (end <= start) end.setHours(start.getHours() + 2);

  const now = new Date();
  const locationParts = [camp.location, camp.city, camp.state].filter(Boolean);
  const location = locationParts.join(', ');

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//OfferHound//Camp//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:camp-${camp.id}@offerhound`,
    `DTSTAMP:${formatIcsDate(now)}`,
    `DTSTART:${formatIcsDate(start)}`,
    `DTEND:${formatIcsDate(end)}`,
    `SUMMARY:${escapeIcs(camp.name)}`,
    camp.description ? `DESCRIPTION:${escapeIcs(camp.description)}` : '',
    location ? `LOCATION:${escapeIcs(location)}` : '',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean);

  return lines.join('\r\n');
}

export async function downloadCampIcs(camp: IcsCamp): Promise<void> {
  const ics = buildCampIcs(camp);
  const safeName = camp.name.replace(/[^a-z0-9-]+/gi, '-').toLowerCase() || 'camp';
  const filename = `${safeName}.ics`;
  const dir = (FileSystem as any).cacheDirectory || (FileSystem as any).documentDirectory;
  const uri = `${dir}${filename}`;
  await (FileSystem as any).writeAsStringAsync(uri, ics);
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'text/calendar',
      dialogTitle: 'Add to calendar',
      UTI: 'com.apple.ical.ics',
    });
  }
}

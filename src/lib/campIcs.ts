// Generate an .ics calendar file for a camp event.
// RN port of Lovable web src/lib/campIcs.ts. Pure logic for buildCampIcs;
// downloadCampIcs writes the .ics to the cache directory and triggers the
// native share sheet via expo-sharing (the iOS/Android share sheet exposes
// "Add to Calendar" via Apple Calendar / Google Calendar / Outlook).

import { File, Paths } from 'expo-file-system';
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
  const day=(value:string)=>{const d=new Date(value+'T00:00:00Z');if(!/^\d{4}-\d{2}-\d{2}$/.test(value)||Number.isNaN(d.getTime())||d.toISOString().slice(0,10)!==value)throw Error('The camp date is invalid.');return d;};
  const start=day(camp.start_date);const end=day(camp.end_date||camp.start_date);if(end<start)throw Error('The camp dates are out of order.');end.setUTCDate(end.getUTCDate()+1);
  const stampDay=(value:Date)=>value.toISOString().slice(0,10).replaceAll('-','');
  const hours=[camp.start_time,camp.end_time].filter(Boolean).join(' – ');
  const description=[camp.description,hours?'Published camp hours: '+hours:'','Camp dates saved. Check OfferHound for local event times.'].filter(Boolean).join('\n');

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
    `DTSTART;VALUE=DATE:${stampDay(start)}`,
    `DTEND;VALUE=DATE:${stampDay(end)}`,
    `SUMMARY:${escapeIcs(camp.name)}`,
    `DESCRIPTION:${escapeIcs(description)}`,
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
  if(!await Sharing.isAvailableAsync())throw Error('Calendar sharing is unavailable on this device.');
  const file=new File(Paths.cache,filename);file.write(ics);
  await Sharing.shareAsync(file.uri,{mimeType:'text/calendar',dialogTitle:'Save camp dates',UTI:'com.apple.ical.ics'});
}

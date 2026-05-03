import { useQuery } from '@tanstack/react-query';
import * as Calendar from 'expo-calendar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface CollegeCamp {
  id: string;
  name: string;
  school: string;
  start_date: string;
  end_date: string | null;
  city: string | null;
  state: string | null;
  registration_url: string | null;
  sport: string;
}

export function useSavedCamps() {
  const { user } = useAuth();
  const { data: savedCamps = [] } = useQuery({
    queryKey: ['saved-camps', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('saved_camps' as any)
        .select('*, camp:college_camps(*)')
        .eq('user_id', user.id);
      return (data || []) as any[];
    },
    enabled: !!user,
  });

  const toggleReminder = async (_campId: string, _value: boolean) => {};
  return { savedCamps, toggleReminder };
}

// RN replacement for ICS download — add the event directly to the device calendar.
export async function addCampToDeviceCalendar(camp: CollegeCamp): Promise<string | null> {
  try {
    // iOS 17+ uses writeOnly permission; expo-calendar v15+ handles this via
    // accessLevel: 'writeOnly' on request. Fallback to legacy API when not
    // available.
    let status: string;
    try {
      const res = await (Calendar as any).requestCalendarPermissionsAsync({ accessLevel: 'writeOnly' });
      status = res?.status;
    } catch {
      const res = await Calendar.requestCalendarPermissionsAsync();
      status = res?.status;
    }
    if (status !== 'granted') return null;

    const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
    const defaultCalendar =
      calendars.find(c => c.allowsModifications && c.source?.name === 'Default') ||
      calendars.find(c => c.allowsModifications) ||
      calendars[0];
    if (!defaultCalendar) return null;

    // Normalise date strings — Supabase returns YYYY-MM-DD which parses as UTC
    // midnight; camps’ local-time intent is lost, so pin start to 09:00 local
    // when no explicit start_time exists (avoids “event invalid” errors on iOS).
    const sd = String(camp.start_date).slice(0, 10);
    const ed = String(camp.end_date || camp.start_date).slice(0, 10);
    const start = new Date(`${sd}T09:00:00`);
    const end = new Date(`${ed}T17:00:00`);
    if (end <= start) end.setHours(start.getHours() + 2);

    return await Calendar.createEventAsync(defaultCalendar.id, {
      title: camp.name || 'Camp',
      startDate: start,
      endDate: end,
      location: [camp.city, camp.state].filter(Boolean).join(', '),
      notes: `${camp.school || ''}${camp.sport ? ` — ${camp.sport}` : ''}`.trim(),
    });
  } catch (e) {
    // parity/2026-04-29 #14 — swallow + return null so callers can show a toast
    // instead of the unhandled "no view found with react tag" crash.
    console.warn('[addCampToDeviceCalendar] failed:', e);
    return null;
  }
}

export function getGoogleCalendarUrl(camp: CollegeCamp) {
  const dateStr = camp.start_date.replace(/-/g, '');
  const loc = encodeURIComponent([camp.city, camp.state].filter(Boolean).join(', '));
  return `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(camp.name)}&dates=${dateStr}/${dateStr}&location=${loc}`;
}

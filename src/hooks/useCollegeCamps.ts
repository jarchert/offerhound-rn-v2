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
  const { status } = await Calendar.requestCalendarPermissionsAsync();
  if (status !== 'granted') return null;

  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const defaultCalendar = calendars.find(c => c.allowsModifications) || calendars[0];
  if (!defaultCalendar) return null;

  const start = new Date(camp.start_date);
  const end = camp.end_date ? new Date(camp.end_date) : new Date(start.getTime() + 24 * 3600 * 1000);

  return Calendar.createEventAsync(defaultCalendar.id, {
    title: camp.name,
    startDate: start,
    endDate: end,
    location: [camp.city, camp.state].filter(Boolean).join(', '),
    notes: `${camp.school} — ${camp.sport}`,
  });
}

export function getGoogleCalendarUrl(camp: CollegeCamp) {
  const dateStr = camp.start_date.replace(/-/g, '');
  const loc = encodeURIComponent([camp.city, camp.state].filter(Boolean).join(', '));
  return `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(camp.name)}&dates=${dateStr}/${dateStr}&location=${loc}`;
}

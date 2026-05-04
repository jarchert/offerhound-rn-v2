// One-click "Add to calendar" button for a camp.
// Parity/2026-04-29 calendar-native fix: writes the event directly to the user's
// native device calendar via expo-calendar instead of generating a .ics file.
// Web parity: Lovable's AddToCalendarButton downloads .ics; in RN the native
// equivalent is Calendar.createEventAsync.
import React from 'react';
import { Button, ButtonVariant, ButtonSize } from '@/components/ui/Button';
import { CalendarPlus } from 'lucide-react-native';
import { addCampToDeviceCalendar, type CollegeCamp } from '@/hooks/useCollegeCamps';
import { toast } from '@/hooks/use-toast';
import { colors } from '@/lib/theme';

interface Props {
  camp: CollegeCamp & {
    description?: string | null;
    location?: string | null;
    start_time?: string | null;
    end_time?: string | null;
  };
  variant?: ButtonVariant;
  size?: ButtonSize;
  label?: string;
}

export function AddToCalendarButton({ camp, variant = 'outline', size = 'sm', label = 'Add to calendar' }: Props) {
  const handle = async () => {
    const result = await addCampToDeviceCalendar(camp as CollegeCamp);
    if (result.ok) {
      toast({ title: 'Added to calendar', description: camp.name });
      return;
    }
    if (result.reason === 'permission-denied') {
      toast({ title: 'Enable calendar adds on your device', variant: 'destructive' });
    } else if (result.reason === 'missing-date') {
      toast({ title: 'Missing camp date', variant: 'destructive' });
    } else {
      toast({ title: "Couldn't add to calendar", variant: 'destructive' });
    }
  };
  return (
    <Button
      variant={variant}
      size={size}
      onPress={handle}
      leftIcon={<CalendarPlus size={16} color={variant === 'default' ? colors.primaryForeground : colors.foreground} />}
    >
      {label}
    </Button>
  );
}

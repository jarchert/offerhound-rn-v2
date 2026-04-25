// One-click .ics calendar share button for a camp.
// Parity port from Lovable src/components/AddToCalendarButton.tsx.
// Web→RN mapping: shadcn Button → src/components/ui/Button; lucide-react → lucide-react-native;
// downloadCampIcs writes .ics to cache and invokes the native share sheet.
import React from 'react';
import { Button, ButtonVariant, ButtonSize } from '@/components/ui/Button';
import { CalendarPlus } from 'lucide-react-native';
import { downloadCampIcs } from '@/lib/campIcs';
import { useToast } from '@/hooks/use-toast';
import { colors } from '@/lib/theme';

interface Props {
  camp: {
    id: string;
    name: string;
    description?: string | null;
    location?: string | null;
    city?: string | null;
    state?: string | null;
    start_date: string;
    end_date?: string | null;
    start_time?: string | null;
    end_time?: string | null;
  };
  variant?: ButtonVariant;
  size?: ButtonSize;
  label?: string;
}

export function AddToCalendarButton({ camp, variant = 'outline', size = 'sm', label = 'Add to calendar' }: Props) {
  const { toast } = useToast();
  const handle = async () => {
    try {
      await downloadCampIcs(camp);
      toast({
        title: 'Calendar file ready',
        description: 'Open it to add the event to Apple/Google/Outlook.',
      });
    } catch {
      toast({ title: 'Download failed', variant: 'destructive' });
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

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import Toast from 'react-native-toast-message';

// Toast helpers to match the `sonner` API used by the original web hook.
const toast = {
  success: (text1: string) => Toast.show({ type: 'success', text1 }),
  error: (text1: string) => Toast.show({ type: 'error', text1 }),
};

export interface CampAlertSubscription {
  id: string;
  email: string;
  sport: string;
  is_verified: boolean;
  user_id: string;
  created_at: string;
  unsubscribed_at: string | null;
}

export function useCampAlertSubscriptions() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: subscriptions = [], isLoading } = useQuery({
    queryKey: ['camp-alert-subscriptions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('camp_alert_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as CampAlertSubscription[];
    },
    enabled: !!user?.id,
  });

  // Filter to active subscriptions
  const activeSubscriptions = subscriptions.filter((s) => !s.unsubscribed_at);

  const subscribeMutation = useMutation({
    mutationFn: async ({ email, sport }: { email: string; sport: string }) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('camp_alert_subscriptions')
        .insert({
          email,
          sport,
          user_id: user.id,
          is_verified: true,
        })
        .select()
        .single();

      if (error) {
        if ((error as any).code === '23505') {
          throw new Error(`You're already subscribed to ${sport} camp alerts`);
        }
        throw error;
      }
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['camp-alert-subscriptions'] });
      toast.success(`Subscribed to ${(data as any).sport} camp alerts`);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const unsubscribeMutation = useMutation({
    mutationFn: async (subscriptionId: string) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('camp_alert_subscriptions')
        .update({ unsubscribed_at: new Date().toISOString() })
        .eq('id', subscriptionId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['camp-alert-subscriptions'] });
      toast.success('Unsubscribed from camp alerts');
    },
    onError: (error: Error) => {
      toast.error('Failed to unsubscribe: ' + error.message);
    },
  });

  const resubscribeMutation = useMutation({
    mutationFn: async (subscriptionId: string) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('camp_alert_subscriptions')
        .update({ unsubscribed_at: null })
        .eq('id', subscriptionId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['camp-alert-subscriptions'] });
      toast.success('Resubscribed to camp alerts');
    },
    onError: (error: Error) => {
      toast.error('Failed to resubscribe: ' + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (subscriptionId: string) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('camp_alert_subscriptions')
        .delete()
        .eq('id', subscriptionId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['camp-alert-subscriptions'] });
      toast.success('Subscription removed');
    },
    onError: (error: Error) => {
      toast.error('Failed to remove subscription: ' + error.message);
    },
  });

  return {
    subscriptions,
    activeSubscriptions,
    isLoading,
    subscribe: subscribeMutation.mutate,
    unsubscribe: unsubscribeMutation.mutate,
    resubscribe: resubscribeMutation.mutate,
    deleteSubscription: deleteMutation.mutate,
    isSubscribing: subscribeMutation.isPending,
    isUnsubscribing: unsubscribeMutation.isPending,
    isResubscribing: resubscribeMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

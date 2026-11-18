// Compat shim for legacy `useToast()` hook from shadcn — delegates to react-native-toast-message
import Toast from 'react-native-toast-message';

type ToastInput = {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
};

export const toast = ({ title, description, variant }: ToastInput) =>
  Toast.show({
    type: variant === 'destructive' ? 'error' : 'success',
    text1: title,
    text2: description,
  });

// Stable callbacks keep consumers' effects and subscriptions from restarting
// whenever a toast-using screen updates its state.
const toastApi = { toast, dismiss: () => Toast.hide() };
export function useToast() {
  return toastApi;
}

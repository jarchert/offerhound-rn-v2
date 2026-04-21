// Compat shim for legacy `useToast()` hook from shadcn — delegates to react-native-toast-message
import Toast from 'react-native-toast-message';

type ToastInput = {
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
};

export function useToast() {
  return {
    toast: ({ title, description, variant }: ToastInput) =>
      Toast.show({
        type: variant === 'destructive' ? 'error' : 'success',
        text1: title,
        text2: description,
      }),
    dismiss: () => Toast.hide(),
  };
}

export const toast = ({ title, description, variant }: ToastInput) =>
  Toast.show({
    type: variant === 'destructive' ? 'error' : 'success',
    text1: title,
    text2: description,
  });

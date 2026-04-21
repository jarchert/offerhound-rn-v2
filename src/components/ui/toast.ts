// Toast wrapper — uses react-native-toast-message which is mounted in App.tsx
import Toast from 'react-native-toast-message';

export type ToastProps = {
  type?: 'success' | 'error' | 'info';
  text1?: string;
  text2?: string;
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive';
};

export type ToastActionElement = React.ReactElement;

export const toast = {
  success: (text1: string, text2?: string) => Toast.show({ type: 'success', text1, text2 }),
  error: (text1: string, text2?: string) => Toast.show({ type: 'error', text1, text2 }),
  info: (text1: string, text2?: string) => Toast.show({ type: 'info', text1, text2 }),
  show: Toast.show,
  hide: Toast.hide,
};

export { default as Toaster } from 'react-native-toast-message';

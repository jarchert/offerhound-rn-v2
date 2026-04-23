// RN port of shareCard.ts — the original used html2canvas + jsPDF for DOM capture.
// In RN we use react-native-view-shot to capture a ref'd View as an image, and
// expo-sharing / expo-file-system to save or share it. PDF export is not
// supported in the mobile client (share as PNG/JPEG instead).
import { captureRef } from 'react-native-view-shot';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { supabase } from '@/integrations/supabase/client';

export type ShareFormat = 'png' | 'jpg';

export interface CapturedCard {
  uri: string;
  base64: string;
  mimeType: string;
  extension: string;
}

/** Capture a ref'd View as an image file. Pass the `.current` of a View ref. */
export async function captureCardImage(
  viewRef: any,
  format: ShareFormat = 'png'
): Promise<CapturedCard> {
  const uri = await captureRef(viewRef, {
    format,
    quality: format === 'jpg' ? 0.92 : 1,
    result: 'tmpfile',
  });
  const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' as any });
  return {
    uri,
    base64,
    mimeType: format === 'jpg' ? 'image/jpeg' : 'image/png',
    extension: format === 'jpg' ? 'jpg' : 'png',
  };
}

/** Share a captured card via the device's native share sheet. */
export async function shareCapturedCard(captured: CapturedCard, dialogTitle = 'Share') {
  if (!(await Sharing.isAvailableAsync())) return false;
  await Sharing.shareAsync(captured.uri, { mimeType: captured.mimeType, dialogTitle });
  return true;
}

export async function sendShareCard(params: {
  channel: 'email' | 'sms';
  recipient: string;
  senderName: string;
  fileName: string;
  mimeType: string;
  base64: string;
  message?: string;
}) {
  const { data, error } = await supabase.functions.invoke('send-share-card', { body: params });
  if (error) throw error;
  if ((data as any)?.error) throw new Error((data as any).error);
  return data;
}

// RN port of shareCard.ts — the original used html2canvas + jsPDF for DOM capture.
// In RN we use react-native-view-shot to capture a ref'd View as an image, and
// expo-sharing / expo-file-system to save or share it.
//
// Build 55 item 6: PDF export is now supported via expo-print. We capture the
// View as a PNG, embed it into a simple HTML document, then print-to-PDF.
import { captureRef } from 'react-native-view-shot';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { supabase } from '@/integrations/supabase/client';

export type ShareFormat = 'png' | 'jpg' | 'pdf';

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
  // expo-print doesn't operate on a raw ref; when caller wants a PDF we
  // capture a PNG first and the caller pipes it into captureCardPdf().
  const imgFormat: 'png' | 'jpg' = format === 'jpg' ? 'jpg' : 'png';
  const uri = await captureRef(viewRef, {
    format: imgFormat,
    quality: imgFormat === 'jpg' ? 0.92 : 1,
    result: 'tmpfile',
  });
  const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' as any });
  return {
    uri,
    base64,
    mimeType: imgFormat === 'jpg' ? 'image/jpeg' : 'image/png',
    extension: imgFormat === 'jpg' ? 'jpg' : 'png',
  };
}

/** Build 55 item 6: capture a ref'd View as a PDF via expo-print. */
export async function captureCardPdf(
  viewRef: any,
  opts: { fileBaseName?: string } = {}
): Promise<CapturedCard> {
  const Print = await import('expo-print');
  // Capture a high-res PNG and embed it into an HTML doc; printToFileAsync
  // turns that HTML into a PDF. This mirrors the Lovable jsPDF approach.
  const png = await captureCardImage(viewRef, 'png');
  const html = `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          @page { margin: 0; }
          html, body { margin: 0; padding: 0; background: #0a0a0a; }
          .wrap { display: flex; align-items: center; justify-content: center; width: 100vw; min-height: 100vh; }
          img { max-width: 100%; height: auto; display: block; }
        </style>
      </head>
      <body>
        <div class="wrap">
          <img src="data:${png.mimeType};base64,${png.base64}" />
        </div>
      </body>
    </html>`;
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  // Read back as base64 for share / Supabase handoff.
  const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' as any });
  return {
    uri,
    base64,
    mimeType: 'application/pdf',
    extension: 'pdf',
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

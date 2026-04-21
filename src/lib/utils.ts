// RN-ported utils — web-only APIs replaced with RN equivalents
import * as Clipboard from 'expo-clipboard';
import Constants from 'expo-constants';

// cn() helper — in RN we don't have tailwind runtime, but keep API shape
// for ported components. Simply joins truthy strings.
export type ClassValue = string | number | boolean | undefined | null | { [k: string]: any } | ClassValue[];
export function cn(...inputs: ClassValue[]): string {
  const out: string[] = [];
  const walk = (v: ClassValue) => {
    if (!v) return;
    if (typeof v === 'string' || typeof v === 'number') { out.push(String(v)); return; }
    if (Array.isArray(v)) { v.forEach(walk); return; }
    if (typeof v === 'object') {
      for (const k in v) if ((v as any)[k]) out.push(k);
    }
  };
  inputs.forEach(walk);
  return out.join(' ');
}

const SUPABASE_URL = 'https://abdzdcgsmdlnytkkhvtb.supabase.co';

export function getProfileShareUrl(customUrl: string): string {
  return `${SUPABASE_URL}/functions/v1/profile-share?u=${encodeURIComponent(customUrl)}`;
}

export function getProfileUrl(customUrl: string): string {
  return `https://offer-hound.com/p/${customUrl}`;
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await Clipboard.setStringAsync(text);
    return true;
  } catch (e) {
    console.error('copyToClipboard failed', e);
    return false;
  }
}

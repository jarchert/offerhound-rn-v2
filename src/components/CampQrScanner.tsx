import React, { useEffect, useRef, useState } from 'react';
import { AppState, Linking, Text, View, StyleSheet } from 'react-native';
import { CameraView, scanFromURLAsync, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useIsFocused } from '@react-navigation/native';
import { Button } from '@/components/ui/Button';
import { colors, spacing } from '@/lib/theme';

type Props = { onCode: (value: string) => Promise<string>; onManual: () => void };
export function CampQrScanner({ onCode, onManual }: Props) {
  const [permission, askPermission, refreshPermission] = useCameraPermissions();
  const [active, setActive] = useState(false);
  const [message, setMessage] = useState('Scan an enrollment QR code or choose a QR image.');
  const busy = useRef(false);
  const focused = useIsFocused();
  useEffect(() => { if (!focused) setActive(false); }, [focused]);
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => { if (state !== 'active') setActive(false); });
    return () => sub.remove();
  }, []);
  const process = async (raw: string) => {
    if (busy.current) return;
    busy.current = true; setActive(false);
    try { setMessage(await onCode(raw)); }
    catch (error: any) { setMessage(error.message || 'Could not check in. Try again.'); }
    finally { busy.current = false; }
  };
  const start = async () => {
    if (busy.current) return;
    try {
      const current = await refreshPermission();
      const result = current.granted || !current.canAskAgain ? current : await askPermission();
      if (!result.granted) { setMessage('Camera access is denied. Use a QR image or manual entry, or enable access in Settings.'); return; }
      setMessage('Point the camera at one enrollment QR code.'); setActive(true);
    } catch { setMessage('The camera is unavailable. Use a QR image or manual entry.'); }
  };
  const image = async () => {
    setActive(false);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1, allowsEditing: false });
      if (result.canceled) return;
      const codes = await scanFromURLAsync(result.assets[0].uri, ['qr']);
      if (codes.length !== 1) { setMessage('Choose an image containing exactly one enrollment QR code.'); return; }
      await process(codes[0].data);
    } catch (error: any) { setMessage(error.message || 'Could not read that QR image. Use manual entry.'); }
  };
  return <View style={s.stack}>
    <Text style={s.heading}>Scan athlete QR</Text>
    {active && focused && permission?.granted && <CameraView testID="camp-qr-camera" style={s.camera} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={({ data }) => { void process(data); }} onMountError={() => { setActive(false); setMessage('The camera is unavailable. Use a QR image or manual entry.'); }} />}
    <Text accessibilityLiveRegion="polite" testID="camp-qr-result" style={s.text}>{message}</Text>
    <Button testID="camp-qr-start" onPress={() => { void start(); }}>{active ? 'Restart camera' : 'Start scanning'}</Button>
    {active && <Button variant="outline" onPress={() => setActive(false)}>Stop camera</Button>}
    <Button testID="camp-qr-image" variant="outline" onPress={() => { void image(); }}>Scan QR image</Button>
    {permission && !permission.granted && !permission.canAskAgain && <Button variant="outline" onPress={() => { void Linking.openSettings(); }}>Open camera settings</Button>}
    <Button testID="camp-qr-manual" variant="outline" onPress={onManual}>Open manual entry</Button>
  </View>;
}
const s = StyleSheet.create({ stack: { gap: spacing.md }, heading: { color: colors.foreground, fontSize: 20 }, text: { color: colors.foreground }, camera: { height: 280, width: '100%' } });

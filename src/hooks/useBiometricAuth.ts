export function useBiometricAuth() {
  return {
     isAvailable: false,
     isEnabled: false,
     isNativePlatform: false,
     getCredentials: async () => null as { email: string; password: string } | null,
     getBiometryName: () => "Biometrics",
  };
}

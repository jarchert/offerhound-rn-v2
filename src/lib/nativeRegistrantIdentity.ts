export type NativeIdentity = { phone: string; birthDate: string; headshotPath: string };
export const emptyNativeIdentity = (): NativeIdentity => ({phone:'',birthDate:'',headshotPath:''});
export function validateNativeIdentity(value: NativeIdentity) {
 const date = new Date(`${value.birthDate}T12:00:00Z`);
 if (!/^\d{4}-\d{2}-\d{2}$/.test(value.birthDate) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0,10)!==value.birthDate || value.birthDate > `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}-${String(new Date().getDate()).padStart(2,'0')}` || date.getUTCFullYear()<new Date().getUTCFullYear()-120) throw new Error('Enter a valid date of birth as YYYY-MM-DD.');
 if (!/^[+0-9 ().-]{7,30}$/.test(value.phone.trim()) || value.phone.replace(/\D/g,'').length<7) throw new Error('Enter a valid telephone number.');
 if (!value.headshotPath) throw new Error('Upload a headshot before registering.');
}

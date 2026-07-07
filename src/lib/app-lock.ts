const LOCK_STORAGE_KEY = "sysadmin-notes-lock";

export type AppLockSettings = {
  enabled: boolean;
  pinHash: string | null;
  autoLockMinutes: number;
};

const defaultSettings: AppLockSettings = {
  enabled: false,
  pinHash: null,
  autoLockMinutes: 5,
};

export function loadLockSettings(): AppLockSettings {
  if (typeof window === "undefined") return defaultSettings;
  try {
    const raw = localStorage.getItem(LOCK_STORAGE_KEY);
    if (!raw) return defaultSettings;
    return { ...defaultSettings, ...JSON.parse(raw) };
  } catch {
    return defaultSettings;
  }
}

export function saveLockSettings(settings: AppLockSettings) {
  localStorage.setItem(LOCK_STORAGE_KEY, JSON.stringify(settings));
}

export async function hashPin(pin: string): Promise<string> {
  const data = new TextEncoder().encode(`sysadmin-lock:${pin}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function verifyPin(pin: string, hash: string | null): Promise<boolean> {
  if (!hash) return false;
  return (await hashPin(pin)) === hash;
}

export async function setupAppLockPin(pin: string): Promise<AppLockSettings> {
  const hash = await hashPin(pin);
  const settings = loadLockSettings();
  return { ...settings, enabled: true, pinHash: hash };
}

export function disableAppLock(): AppLockSettings {
  const settings = loadLockSettings();
  return { ...settings, enabled: false, pinHash: null };
}
import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";

const isNative = Capacitor.isNativePlatform();

/** Persiste chaves de auth do Supabase e preferências entre aberturas do app no mobile. */
export const supabaseAuthStorage = {
  getItem: async (key: string): Promise<string | null> => {
    if (isNative) {
      const { value } = await Preferences.get({ key });
      return value;
    }
    return localStorage.getItem(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (isNative) {
      await Preferences.set({ key, value });
      return;
    }
    localStorage.setItem(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    if (isNative) {
      await Preferences.remove({ key });
      return;
    }
    localStorage.removeItem(key);
  },
};

export async function getPersistedValue(key: string): Promise<string | null> {
  if (isNative) {
    const { value } = await Preferences.get({ key });
    return value;
  }
  return localStorage.getItem(key);
}

export async function setPersistedValue(key: string, value: string): Promise<void> {
  if (isNative) {
    await Preferences.set({ key, value });
    return;
  }
  localStorage.setItem(key, value);
}

export async function removePersistedValue(key: string): Promise<void> {
  if (isNative) {
    await Preferences.remove({ key });
    return;
  }
  localStorage.removeItem(key);
}

/** Copia sessão Supabase do localStorage do WebView para Preferences (uma vez). */
export async function migrateSupabaseSessionFromWebStorage(): Promise<void> {
  if (!isNative) return;

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith("sb-")) continue;
    const value = localStorage.getItem(key);
    if (!value) continue;
    const { value: existing } = await Preferences.get({ key });
    if (!existing) await Preferences.set({ key, value });
  }
}

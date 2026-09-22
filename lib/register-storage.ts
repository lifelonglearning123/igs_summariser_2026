/**
 * Where the client register lives in the browser.
 *
 * Shared by the matcher and the inbox so a coach loads their register once and
 * it is there for the whole morning, rather than once per email. It never
 * leaves the browser except to score a match.
 */

export const REGISTER_STORAGE_KEY = 'igs-summariser.register.v1';

export interface LoadedRegister {
  raw: unknown;
  count: number;
  name: string;
}

/** Count the clients in whatever shape the register JSON arrived in. */
export function describeRegister(raw: unknown, name: string): LoadedRegister {
  const clients = Array.isArray(raw) ? raw : (raw as { clients?: unknown[] })?.clients;
  if (!Array.isArray(clients) || clients.length === 0) {
    throw new Error('That file has no clients in it. Expected a JSON array, or an object with a "clients" array.');
  }
  return { raw, count: clients.length, name };
}

export function loadStoredRegister(): LoadedRegister | null {
  try {
    const stored = window.localStorage.getItem(REGISTER_STORAGE_KEY);
    if (!stored) return null;
    const { name, raw } = JSON.parse(stored) as { name: string; raw: unknown };
    return describeRegister(raw, name);
  } catch {
    // Corrupt or unavailable storage: start without a register.
    return null;
  }
}

export function storeRegister(register: LoadedRegister): void {
  try {
    window.localStorage.setItem(
      REGISTER_STORAGE_KEY,
      JSON.stringify({ name: register.name, raw: register.raw })
    );
  } catch {
    // Register too large for storage, or storage unavailable: it still works
    // for this session, it just will not be remembered.
  }
}

export function clearStoredRegister(): void {
  try {
    window.localStorage.removeItem(REGISTER_STORAGE_KEY);
  } catch {
    // Nothing to do.
  }
}

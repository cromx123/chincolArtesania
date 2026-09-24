// Datos que la clienta guardó en ESTE dispositivo. El autocompletado sale solo de aquí,
// nunca del servidor: así nadie ve datos ajenos escribiendo un número de teléfono.

const STORAGE_KEY = "chincol.cliente.v1";

export interface SavedCustomer {
  token: string;
  name: string;
  phone: string;
  email: string;
  comuna: string;
}

export function loadSavedCustomer(): SavedCustomer | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const data = raw ? JSON.parse(raw) : null;
    return data && typeof data.token === "string" && typeof data.name === "string" ? data : null;
  } catch {
    return null;
  }
}

export function saveCustomer(c: SavedCustomer) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
  } catch {}
}

export function forgetCustomer() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

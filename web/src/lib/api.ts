// In the browser: use relative /api/v1 so requests go through Nginx on port 80.
// In SSR (Node.js): use the internal Docker service URL.
function getBase(): string {
  if (typeof window !== 'undefined') {
    // Browser — relative URL, no CORS issue
    return '/api/v1';
  }
  // Server-side render — call API container directly
  return process.env.NEXT_PUBLIC_API_URL || 'http://api:3001/api/v1';
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const base = getBase();
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `HTTP ${res.status}`);
  }
  return res.json();
}

// Lightweight helper for admin pages using raw fetch() directly instead of
// the api.* wrapper above. Throws with the server's actual error message
// instead of silently returning the error body as if it were real data —
// without this, a 401/403 response gets treated as valid JSON and renders
// as an all-zero dashboard with no visible error.
export async function fetchOrThrow<T = any>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Request failed (HTTP ${res.status})`);
  }
  return res.json();
}

export const api = {
  get:    <T>(path: string)             => request<T>(path),
  post:   <T>(path: string, body: any)  => request<T>(path, { method: 'POST',  body: JSON.stringify(body) }),
  put:    <T>(path: string, body: any)  => request<T>(path, { method: 'PUT',   body: JSON.stringify(body) }),
  patch:  <T>(path: string, body: any)  => request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string)             => request<T>(path, { method: 'DELETE' }),
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Vehicle {
  id: string;
  make: string;
  model: string;
  year: number;
  trim?: string;
  body_type?: string;
  fuel_type?: string;
  transmission?: string;
  engine?: string;
  mileage_km: number;
  color_exterior?: string;
  color_interior?: string;
  price_aed: number;
  price_suggested_aed?: number;
  currency?: string; // the vehicle's actual listing currency (AED/SAR/QAR/BHD/KWD/OMR) — set from the dealer's country
  status: string;
  export_eligible: boolean;
  view_count: number;
  favorite_count: number;
  created_at: string;
  vehicle_images?: VehicleImage[];
  dealer?: DealerSnippet;
  promotions?: Promotion[];
}

export interface VehicleImage {
  id: string;
  cdn_url: string;
  thumb_url?: string;
  is_primary: boolean;
  position: number;
}

export interface DealerSnippet {
  id: string;
  company_name: string;
  slug: string;
  verified: boolean;
  rating: number;
  whatsapp?: string;
}

export interface Dealer {
  id: string;
  company_name: string;
  slug: string;
  description?: string;
  logo_url?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  website?: string;
  address?: string;
  city?: string;
  languages: string[];
  export_destinations: string[];
  verified: boolean;
  rating: number;
  review_count: number;
  country?: { id: string; code: string; name: string } | null;
  free_zone?: { id: string; code: string; name: string; city: string | null } | null;
}

export interface Promotion {
  id: string;
  type: string;
  original_price: number;
  promo_price: number;
  label?: string;
  ends_at?: string;
}

export interface SearchResult {
  items: Vehicle[];
  total: number;
  page: number;
  limit: number;
  pages: number;
  facets: { makes: Array<{ value: string; count: number }> };
}

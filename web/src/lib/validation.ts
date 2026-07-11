// ─── validation.ts ──────────────────────────────────────────────────────────
// Shared client-side validators. Rules are kept in sync with the backend
// DTOs (api/src/modules/**/dto/*.dto.ts) so users get the same feedback
// before submitting as the server will enforce after.
//
// NOTE: this is a UX layer only. The backend re-validates everything —
// never trust the client-side result for security decisions.

export type FieldErrors<T extends string = string> = Partial<Record<T, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[0-9\s\-()]{6,20}$/;
const VIN_RE = /^[A-HJ-NPR-Z0-9]{11,17}$/i;
const PASSWORD_STRONG_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;

export function isEmail(value: string | undefined | null): boolean {
  return !!value && EMAIL_RE.test(value.trim());
}

export function isPhone(value: string | undefined | null): boolean {
  return !!value && PHONE_RE.test(value.trim());
}

export function isVin(value: string | undefined | null): boolean {
  return !!value && VIN_RE.test(value.trim());
}

export function passwordError(value: string | undefined | null): string | null {
  if (!value) return 'Password is required';
  if (value.length < 8) return 'Password must be at least 8 characters';
  if (value.length > 72) return 'Password is too long';
  if (!PASSWORD_STRONG_RE.test(value)) {
    return 'Password must contain an uppercase letter, a lowercase letter, and a digit';
  }
  return null;
}

export function emailError(value: string | undefined | null): string | null {
  if (!value || !value.trim()) return "Email is required";
  if (!isEmail(value)) return 'Invalid email address';
  return null;
}

export function phoneError(value: string | undefined | null, required = false): string | null {
  if (!value || !value.trim()) return required ? 'Phone number is required' : null;
  if (!isPhone(value)) return 'Invalid phone number';
  return null;
}

export function requiredError(value: string | undefined | null, label: string, min = 1, max = 500): string | null {
  const v = (value || '').trim();
  if (v.length < min) return `${label} is required`;
  if (v.length > max) return `${label} is too long (max ${max} characters)`;
  return null;
}

export function numberRangeError(
  value: number | string | undefined | null,
  label: string,
  min: number,
  max: number,
): string | null {
  if (value === undefined || value === null || value === '') return `${label} is required`;
  const n = typeof value === 'string' ? Number(value) : value;
  if (Number.isNaN(n)) return `${label} must be a number`;
  if (n < min || n > max) return `${label} must be between ${min} and ${max}`;
  return null;
}

export function priceError(value: number | string | undefined | null, label = 'Price'): string | null {
  if (value === undefined || value === null || value === '') return `${label} is required`;
  const n = typeof value === 'string' ? Number(value) : value;
  if (Number.isNaN(n)) return `${label} must be a valid number`;
  if (n < 0) return `${label} cannot be negative`;
  if (n > 100_000_000) return `${label} looks incorrect`;
  return null;
}

export function vinError(value: string | undefined | null): string | null {
  if (!value || !value.trim()) return null; // VIN is optional
  if (!isVin(value)) return 'Invalid VIN (11 to 17 alphanumeric characters)';
  return null;
}

export function yearError(value: number | string | undefined | null): string | null {
  const currentYear = new Date().getFullYear();
  return numberRangeError(value, "Year", 1950, currentYear + 1);
}

// Helper to run a set of {field: validatorFn} pairs against a values object
// and collect only the non-null error messages.
export function validateAll<T extends Record<string, any>>(
  values: T,
  validators: { [K in keyof T]?: (v: T[K]) => string | null },
): FieldErrors<Extract<keyof T, string>> {
  const errors: FieldErrors<Extract<keyof T, string>> = {};
  (Object.keys(validators) as Array<keyof T>).forEach((key) => {
    const validator = validators[key];
    if (!validator) return;
    const message = validator(values[key]);
    if (message) errors[key as Extract<keyof T, string>] = message;
  });
  return errors;
}

export function hasErrors(errors: FieldErrors): boolean {
  return Object.values(errors).some(Boolean);
}

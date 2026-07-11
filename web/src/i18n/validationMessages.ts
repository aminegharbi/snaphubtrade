import { Locale } from './translations';

// validation.ts messages are built from a small number of fixed shapes with
// an interpolated field label (e.g. "Make is required", "Mileage must be
// between 0 and 2000000"). Rather than keying a dictionary by every exact
// sentence (fragile — breaks the moment a new label is passed), this matches
// the shape with a regex and translates the fixed part + the label
// separately. Unknown labels fall back to the English label rather than
// breaking the message.

const LABELS_AR: Record<string, string> = {
  'Name / company': 'الاسم / الشركة',
  'Make': 'الماركة',
  'Model': 'الموديل',
  'Mileage': 'المسافة المقطوعة',
  'Stock quantity': 'الكمية في المخزون',
  'Price': 'السعر',
  'Year': 'السنة',
  'Email': 'البريد الإلكتروني',
  'Phone': 'الهاتف',
};

const EXACT_AR: Record<string, string> = {
  'Password is required': 'كلمة المرور مطلوبة',
  'Password must be at least 8 characters': 'يجب أن تتكون كلمة المرور من 8 أحرف على الأقل',
  'Password is too long': 'كلمة المرور طويلة جدًا',
  'Password must contain an uppercase letter, a lowercase letter, and a digit': 'يجب أن تحتوي كلمة المرور على حرف كبير وحرف صغير ورقم',
  'Email is required': 'البريد الإلكتروني مطلوب',
  'Invalid email address': 'عنوان بريد إلكتروني غير صالح',
  'Phone number is required': 'رقم الهاتف مطلوب',
  'Invalid phone number': 'رقم هاتف غير صالح',
  'Invalid VIN (11 to 17 alphanumeric characters)': 'رقم شاصي غير صالح (11 إلى 17 حرفًا ورقمًا)',
};

function labelAr(label: string) {
  return LABELS_AR[label] || label;
}

export function translateValidationError(msg: string | null | undefined, locale: Locale): string {
  if (!msg) return '';
  if (locale === 'en') return msg;

  if (EXACT_AR[msg]) return EXACT_AR[msg];

  let m: RegExpMatchArray | null;
  if ((m = msg.match(/^(.+) is required$/))) return `${labelAr(m[1])} مطلوب`;
  if ((m = msg.match(/^(.+) is too long \(max (\d+) characters\)$/))) return `${labelAr(m[1])} طويل جدًا (الحد الأقصى ${m[2]} حرفًا)`;
  if ((m = msg.match(/^(.+) must be a valid number$/))) return `${labelAr(m[1])} يجب أن يكون رقمًا صحيحًا`;
  if ((m = msg.match(/^(.+) must be a number$/))) return `${labelAr(m[1])} يجب أن يكون رقمًا`;
  if ((m = msg.match(/^(.+) must be between (.+) and (.+)$/))) return `${labelAr(m[1])} يجب أن يكون بين ${m[2]} و ${m[3]}`;
  if ((m = msg.match(/^(.+) cannot be negative$/))) return `${labelAr(m[1])} لا يمكن أن يكون سالبًا`;
  if ((m = msg.match(/^(.+) looks incorrect$/))) return `${labelAr(m[1])} يبدو غير صحيح`;

  return msg; // unrecognized shape — show the English message rather than nothing
}

/**
 * Who a message goes to, and whether it can go yet. The rules are the
 * prototype's (source/app-logic.js, compose): a WhatsApp number needs eight
 * local digits once leading zeros are dropped; an email needs the usual
 * name@domain.tld shape.
 */

export type FieldState = 'empty' | 'typing' | 'ok' | 'bad';

/** "055 123 4567" → "551234567": digits only, without the trunk zero. */
export function localDigits(phone: string): string {
  return phone.replace(/\D/g, '').replace(/^0+/, '');
}

export function phoneValid(phone: string): boolean {
  return localDigits(phone).length >= 8;
}

/**
 * Not shouted about while still being typed: a number is only "bad" from six
 * digits on, or once Send has been tried.
 */
export function phoneState(phone: string, tried: boolean): FieldState {
  const local = localDigits(phone);
  if (phoneValid(phone)) return 'ok';
  if ((tried || local.length > 0) && (tried || local.length >= 6)) return 'bad';
  return phone ? 'typing' : 'empty';
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function emailValid(email: string): boolean {
  return EMAIL.test(email);
}

/** An address is only "bad" once it has an @ and five characters, or Send was tried. */
export function emailState(email: string, tried: boolean): FieldState {
  if (emailValid(email)) return 'ok';
  if ((tried || email.includes('@')) && (tried || email.length > 5)) return 'bad';
  return email ? 'typing' : 'empty';
}

/** wa.me wants the full international number as bare digits. */
export function whatsAppUrl(dial: string, phone: string, text: string): string {
  return `https://wa.me/${dial.replace(/\D/g, '')}${localDigits(phone)}?text=${encodeURIComponent(text)}`;
}

export function mailtoUrl(to: string, subject: string, body: string): string {
  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function telUrl(dial: string, phone: string): string {
  return `tel:+${dial.replace(/\D/g, '')}${localDigits(phone)}`;
}

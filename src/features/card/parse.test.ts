import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { parseCard } from './parse';

describe('parseCard — English', () => {
  it('reads a typical card, preferring the mobile over the office line', () => {
    const f = parseCard(
      ['NORTHWIND VENTURES', 'Sara Haddad', 'Managing Partner', 'T: +966 11 222 3333', 'M: +966 50 123 4567', 'sara@northwind.vc', 'www.northwind.vc', 'King Fahd Road, Riyadh'],
      { region: 'SA' }
    );
    assert.equal(f.name, 'Sara Haddad');
    assert.equal(f.role, 'Managing Partner · Northwind Ventures');
    assert.equal(f.dial, '+966');
    assert.equal(f.phone, '501234567');
    assert.equal(f.email, 'sara@northwind.vc');
  });
  it('splits "Founder, Company" and reads an Egyptian number', () => {
    const f = parseCard(['Ahmed Tahoun', 'Founder, KitchenTrace', '+20 100 123 4567', 'ahmed@kitchentrace.com']);
    assert.equal(f.name, 'Ahmed Tahoun');
    assert.equal(f.role, 'Founder · KitchenTrace');
    assert.equal(f.dial, '+20');
    assert.equal(f.phone, '1001234567');
  });
  it('ignores the fax and the web address', () => {
    const f = parseCard(['Omar Khaled', 'Sales Manager', 'Acme Trading LLC', 'Fax: +971 4 000 0000', 'Tel: +971 50 331 2045', 'www.acme.com']);
    assert.equal(f.phone, '503312045');
    assert.equal(f.dial, '+971');
    assert.equal(f.role, 'Sales Manager · Acme Trading LLC');
  });
  it('takes a name even when the card has no title', () => {
    const f = parseCard(['Layla Nasser', '0501234567', 'layla@gmail.com'], { region: 'SA' });
    assert.equal(f.name, 'Layla Nasser');
    assert.equal(f.role, undefined);
  });
  it('does not mistake a company or a street for a name', () => {
    const f = parseCard(['Acme Trading LLC', 'Omar Khaled', 'Building 4 Floor 2', '0503312045']);
    assert.equal(f.name, 'Omar Khaled');
  });
});

describe('parseCard — Arabic', () => {
  it('reads an Arabic card with Arabic-Indic digits', () => {
    const f = parseCard(['شركة الشمال للتجارة', 'خالد المنصوري', 'المدير التنفيذي', 'جوال: ٠٥٠١٢٣٤٥٦٧', 'khaled@alshamal.com', 'الرياض - طريق الملك فهد'], { region: 'SA', prefer: 'ar' });
    assert.equal(f.name, 'خالد المنصوري');
    assert.equal(f.role, 'المدير التنفيذي · شركة الشمال للتجارة');
    assert.equal(f.phone, '501234567');
    assert.equal(f.email, 'khaled@alshamal.com');
  });
  it('picks the name in the person’s language on a bilingual card', () => {
    const lines = ['Khaled Al-Mansouri', 'Chief Executive Officer', 'خالد المنصوري', 'الرئيس التنفيذي', '+966 50 123 4567'];
    assert.equal(parseCard(lines, { prefer: 'ar' }).name, 'خالد المنصوري');
    assert.equal(parseCard(lines, { prefer: 'en' }).name, 'Khaled Al-Mansouri');
  });
});

describe('parseCard — noise', () => {
  it('gives back nothing from nothing', () => {
    assert.deepEqual(parseCard([]), {});
    assert.deepEqual(parseCard(['x', '--']), {});
  });
});

describe('parseCard — a business card with no person on it', () => {
  const lines = ['My Swim', 'ACADEMY', '01100489485 - 01064432564'];
  it('reads two numbers printed on one line, and takes the first', () => {
    const f = parseCard(lines, { region: 'EG' });
    assert.equal(f.dial, '+20');
    assert.equal(f.phone, '1100489485');
  });
  it('joins the logo words into one name', () => {
    assert.equal(parseCard(lines, { region: 'EG' }).name, 'My Swim Academy');
  });
  it('keeps the street as the address', () => {
    const f = parseCard(['Sara Haddad', 'Managing Partner', '+966 50 123 4567', 'King Fahd Road, Riyadh'], { region: 'SA' });
    assert.equal(f.address, 'King Fahd Road, Riyadh');
  });
});

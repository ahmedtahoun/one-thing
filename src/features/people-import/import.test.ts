import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { strToU8, zipSync } from 'fflate';

import { defaultSelection, flagDuplicates, readTable, readVcf } from './columns';
import { parseCsv } from './csv';
import { parseVcf } from './vcf';
import { parseXlsx } from './xlsx';
import type { Contact } from '@/lib/model-types';

describe('parseCsv', () => {
  it('reads quotes, commas and line breaks inside cells', () => {
    assert.deepEqual(parseCsv('Name,Note\n"Haddad, Sara","said ""hi""\nthen left"\nOmar,ok'), [
      ['Name', 'Note'],
      ['Haddad, Sara', 'said "hi"\nthen left'],
      ['Omar', 'ok'],
    ]);
  });
  it('handles Windows line ends, a BOM and blank rows', () => {
    assert.deepEqual(parseCsv('\uFEFFa,b\r\n\r\n1,2\r\n'), [['a', 'b'], ['1', '2']]);
  });
  it('finds semicolons and tabs', () => {
    assert.deepEqual(parseCsv('الاسم;الجوال\nسارة;0501234567'), [['الاسم', 'الجوال'], ['سارة', '0501234567']]);
    assert.deepEqual(parseCsv('a\tb\n1\t2'), [['a', 'b'], ['1', '2']]);
  });
});

/** A minimal .xlsx, built the way Excel lays one out. */
function xlsx(sheet: string, strings: string[]): Uint8Array {
  return zipSync({
    'xl/sharedStrings.xml': strToU8(`<sst>${strings.map((s) => `<si><t>${s}</t></si>`).join('')}</sst>`),
    'xl/worksheets/sheet1.xml': strToU8(`<worksheet><sheetData>${sheet}</sheetData></worksheet>`),
  });
}

describe('parseXlsx', () => {
  it('reads shared strings, numbers and gaps', () => {
    const rows = parseXlsx(
      xlsx(
        '<row r="1"><c r="A1" t="s"><v>0</v></c><c r="C1" t="s"><v>1</v></c></row>' +
          '<row r="2"><c r="A2" t="s"><v>2</v></c><c r="B2"><v>501234567</v></c><c r="C2" t="inlineStr"><is><t>a &amp; b</t></is></c></row>',
        ['Name', 'Email', 'Sara']
      )
    );
    assert.deepEqual(rows, [['Name', '', 'Email'], ['Sara', '501234567', 'a & b']]);
  });
  it('reads Arabic text', () => {
    const rows = parseXlsx(xlsx('<row r="1"><c r="A1" t="s"><v>0</v></c></row>', ['سارة حداد']));
    assert.deepEqual(rows, [['سارة حداد']]);
  });
});

describe('parseVcf', () => {
  it('reads several people, preferring the mobile number', () => {
    const people = parseVcf(
      'BEGIN:VCARD\nVERSION:3.0\nFN:Sara Haddad\nORG:Northwind;\nTITLE:Investor\nTEL;TYPE=WORK:+966 11 111 1111\nTEL;TYPE=CELL:+966 50 123 4567\nEMAIL;TYPE=INTERNET:sara@x.com\nEND:VCARD\n' +
        'BEGIN:VCARD\nN:Khaled;Omar;;;\nTEL:0503312045\nEND:VCARD'
    );
    assert.deepEqual(people[0], { name: 'Sara Haddad', phone: '+966 50 123 4567', email: 'sara@x.com', company: 'Northwind', title: 'Investor' });
    assert.equal(people[1]?.name, 'Omar Khaled');
    assert.equal(people[1]?.phone, '0503312045');
  });
});

describe('readTable', () => {
  it('matches English headers', () => {
    const { candidates, header } = readTable(
      [
        ['Full Name', 'Mobile', 'E-mail', 'Company', 'Job Title'],
        ['Sara Haddad', '+966 50 123 4567', 'Sara@X.com', 'Northwind', 'Investor'],
      ],
      'SA'
    );
    assert.equal(header, true);
    assert.deepEqual(candidates[0], { key: 'r0', name: 'Sara Haddad', role: 'Investor · Northwind', dial: '+966', phone: '501234567', email: 'sara@x.com', issues: [] });
  });
  it('matches Arabic headers', () => {
    const { candidates } = readTable([['الاسم', 'الجوال', 'الايميل', 'الشركة'], ['سارة حداد', '0501234567', 'sara@x.com', 'الشمال']], 'SA');
    assert.equal(candidates[0]?.name, 'سارة حداد');
    assert.equal(candidates[0]?.phone, '501234567');
    assert.equal(candidates[0]?.email, 'sara@x.com');
    assert.equal(candidates[0]?.role, 'الشمال');
  });
  it('joins first and last names, and reads a Google Contacts export', () => {
    const { candidates } = readTable(
      [
        ['First Name', 'Last Name', 'Organization Name', 'Organization Title', 'Phone 1 - Label', 'Phone 1 - Value', 'E-mail 1 - Value'],
        ['Omar', 'Khaled', 'Acme', 'CEO', 'Mobile', '+971 50 331 2045', 'omar@acme.com'],
      ],
      'AE'
    );
    assert.equal(candidates[0]?.name, 'Omar Khaled');
    assert.equal(candidates[0]?.role, 'CEO · Acme');
    assert.equal(candidates[0]?.dial, '+971');
    assert.equal(candidates[0]?.phone, '503312045');
  });
  it('finds the columns of a file with no header', () => {
    const { candidates, header } = readTable(
      [
        ['Sara Haddad', 'sara@x.com', '0501234567'],
        ['Omar Khaled', 'omar@acme.com', '0503312045'],
      ],
      'SA'
    );
    assert.equal(header, false);
    assert.equal(candidates.length, 2);
    assert.equal(candidates[1]?.name, 'Omar Khaled');
    assert.equal(candidates[1]?.email, 'omar@acme.com');
    assert.equal(candidates[1]?.phone, '503312045');
  });
  it('repairs the numbers Excel mangles', () => {
    const { candidates } = readTable([['Name', 'Phone'], ['A One', '9.66501234567E+11'], ['B Two', '501234567.0']], 'SA');
    assert.equal(candidates[0]?.dial, '+966');
    assert.equal(candidates[0]?.phone, '501234567');
    assert.equal(candidates[1]?.phone, '501234567');
  });
  it('reads numbers written in Arabic-Indic digits', () => {
    const { candidates } = readTable([['الاسم', 'الجوال'], ['نورة الحربي', '٠٥٠٩٩٩٨٨٧٧']], 'SA');
    assert.equal(candidates[0]?.phone, '509998877');
    assert.deepEqual(candidates[0]?.issues, []);
    // And finds the column with no header at all.
    const bare = readTable([['نورة الحربي', '٠٥٠٩٩٩٨٨٧٧'], ['سارة حداد', '٠٥٥١٢٣٤٥٦٧']], 'SA');
    assert.equal(bare.header, false);
    assert.equal(bare.candidates[1]?.phone, '551234567');
  });
  it('knows an Egyptian mobile whatever the region', () => {
    const { candidates } = readTable([['Name', 'Phone'], ['Ahmed Ali', '01001234567']], 'US');
    assert.equal(candidates[0]?.dial, '+20');
    assert.equal(candidates[0]?.phone, '1001234567');
  });
  it('flags a bad email or number without losing the person', () => {
    const { candidates } = readTable([['Name', 'Phone', 'Email'], ['Sara Haddad', '123', 'not-an-email']]);
    assert.deepEqual(candidates[0]?.issues.sort(), ['bad-email', 'bad-phone']);
    assert.equal(candidates[0]?.phone, undefined);
  });
  it('uses the company when there is no name, and drops empty rows', () => {
    const { candidates } = readTable([['Name', 'Company', 'Phone'], ['', 'Al Noor Packaging', '0501234567'], ['', '', '']]);
    assert.equal(candidates.length, 1);
    assert.equal(candidates[0]?.name, 'Al Noor Packaging');
    assert.equal(candidates[0]?.role, undefined);
  });
  it('keeps a number with no name, but will not import it by default', () => {
    const { candidates } = readTable([['Name', 'Phone'], ['', '0501234567']]);
    assert.deepEqual(candidates[0]?.issues, ['no-name']);
    assert.equal(defaultSelection(candidates).size, 0);
  });
});

describe('flagDuplicates', () => {
  const existing: Contact[] = [{ id: 'c1', name: 'Sara Haddad', phone: '501234567', createdAt: '' }];
  it('marks people already saved, by number, and repeats in the same file', () => {
    const { candidates } = readTable([['Name', 'Phone'], ['S. Haddad', '0501234567'], ['Omar Khaled', '0503312045'], ['Omar Khaled', '0509999999']], 'SA');
    const flagged = flagDuplicates(candidates, existing);
    assert.equal(flagged[0]?.duplicateOf, 'Sara Haddad');
    assert.equal(flagged[1]?.duplicateOf, undefined);
    assert.equal(flagged[2]?.duplicateOf, 'Omar Khaled');
    assert.deepEqual([...defaultSelection(flagged)], ['r1']);
  });
});

describe('readVcf', () => {
  it('turns vCard people into candidates', () => {
    const c = readVcf([{ name: 'Sara Haddad', phone: '+966 50 123 4567', email: 'sara@x.com', company: 'Northwind', title: '' }]);
    assert.equal(c[0]?.dial, '+966');
    assert.equal(c[0]?.role, 'Northwind');
  });
});

import { candidatesFromFile } from './read-file';

describe('candidatesFromFile', () => {
  const file = (name: string, text = '', bytes: Uint8Array = new Uint8Array(), mime: string | null = null) => ({
    name,
    mime,
    text: async () => text,
    bytes: async () => bytes,
  });
  it('opens a CSV, flagging someone already saved', async () => {
    const existing: Contact[] = [{ id: 'c1', name: 'Sara Haddad', phone: '501234567', createdAt: '' }];
    const result = await candidatesFromFile(file('people.csv', 'Name,Phone\nSara Haddad,0501234567\nOmar Khaled,0503312045'), existing, 'SA');
    assert.ok('candidates' in result);
    if ('candidates' in result) {
      assert.equal(result.candidates.length, 2);
      assert.equal(result.candidates[0]?.duplicateOf, 'Sara Haddad');
    }
  });
  it('opens an Excel file and a vCard', async () => {
    const book = xlsx('<row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c></row><row r="2"><c r="A2" t="s"><v>2</v></c><c r="B2"><v>501234567</v></c></row>', ['Name', 'Phone', 'Sara Haddad']);
    const a = await candidatesFromFile(file('book.xlsx', '', book), [], 'SA');
    assert.ok('candidates' in a && a.candidates[0]?.name === 'Sara Haddad');
    const b = await candidatesFromFile(file('c.vcf', 'BEGIN:VCARD\nFN:Omar Khaled\nTEL:0503312045\nEND:VCARD'), [], 'SA');
    assert.ok('candidates' in b && b.candidates[0]?.name === 'Omar Khaled');
  });
  it('explains what it cannot open', async () => {
    assert.deepEqual(await candidatesFromFile(file('old.xls'), []), { error: 'oldExcel' });
    assert.deepEqual(await candidatesFromFile(file('photo.png'), []), { error: 'unknown' });
    assert.deepEqual(await candidatesFromFile(file('empty.csv', 'Name,Phone\n'), []), { error: 'empty' });
  });
});

describe('readTable — a sales prospect sheet', () => {
  const rows = [
    ['Company Name', 'Contact Person', 'Title', 'STATUS', 'Phone', 'Email', 'Website'],
    ['Aachi Masala Foods', 'Ashok S', 'Operations Manager', 'NO RESPONSE', '=+91 9940348619, +971 875 6383', 'ashok.s@aachigroup.com', 'www.aachigroup.com'],
    ['Chefs Palette / Kerry', 'Jovana Opricovic', 'Foodservice Marketing Specialist', 'NO RESPONSE', '—', 'jovana.opricovic@kerry.com', 'www.kerry.com'],
    ['Choitrams / Flora', 'Lisa Blake / Jayadeep Paliath', 'MENA Brand Manager / Sales Manager', 'Send Catalogue in mail', '=+971 4 5473437, +971 55 857 9607', 'Lisa.blake@florafg.com, jayadeep.paliath@choithrams.com', 'www.x.com'],
    ['dmg events', 'Hassan', '—', '', '=+971 4 4380355, +971 56 8360993', 'aysehassan@dmgeventsme.com', '—'],
    ['Arab Marketing', 'Simon Bakht', '—', '', '=+961-1-740378 / 741223 / 751262', 'SBakht@amfime.com', '—'],
  ];
  const { candidates } = readTable(rows, 'AE');
  it('reads one number out of a cell that holds several, ignoring the stray =', () => {
    assert.equal(candidates[0]?.dial, '+91');
    assert.equal(candidates[0]?.phone, '9940348619');
  });
  it('keeps the status as the contact’s note and treats a dash as empty', () => {
    assert.equal(candidates[0]?.note, 'NO RESPONSE');
    assert.equal(candidates[1]?.phone, undefined);
    assert.deepEqual(candidates[1]?.issues, []);
    assert.equal(candidates[4]?.role, 'dmg events');
  });
  it('makes two people of "A / B", with their own title and email, the mobile to the first', () => {
    const [lisa, jay] = [candidates[2], candidates[3]];
    assert.equal(lisa?.name, 'Lisa Blake');
    assert.equal(lisa?.role, 'MENA Brand Manager · Choitrams / Flora');
    assert.equal(lisa?.email, 'lisa.blake@florafg.com');
    assert.equal(lisa?.phone, '558579607');
    assert.equal(jay?.name, 'Jayadeep Paliath');
    assert.equal(jay?.role, 'Sales Manager · Choitrams / Flora');
    assert.equal(jay?.email, 'jayadeep.paliath@choithrams.com');
  });
  it('drops a short tail after a slash as an extension, not a second number', () => {
    const simon = candidates.find((c) => c.name === 'Simon Bakht');
    assert.equal(simon?.dial, '+961');
    assert.equal(simon?.phone, '1740378');
  });
});

describe('readTable — a store export and a lead sheet', () => {
  it('ignores "Accepts … Marketing" columns, joins the street, city and apartment, and drops the codes', () => {
    const rows = [
      ['Customer ID', 'First Name', 'Last Name', 'Email', 'Accepts Email Marketing', 'Default Address Company', 'Default Address Address1', 'Default Address Address2', 'Default Address City', 'Default Address Province Code', 'Default Address Country Code', 'Phone', 'Accepts WhatsApp Marketing'],
      ["'1", 'Aye', 'Min', 'aye@x.com', 'yes', 'Nikki beach hotel', 'Nikki beach', 'Villa 4', 'Dubai', 'DU', 'AE', "'+971521348661", 'no'],
      ["'2", 'Tommy', 'Ellema', 'tommy@x.com', 'no', '', '', '', '', 'DU', 'AE', '', 'no'],
    ];
    const [aye, tommy] = readTable(rows, 'AE').candidates;
    assert.equal(aye?.address, 'Nikki beach, Villa 4, Dubai');
    assert.equal(aye?.phone, '521348661');
    assert.deepEqual(aye?.issues, []);
    assert.deepEqual(tommy?.issues, []);
    assert.equal(tommy?.address, undefined);
  });
  it('gives the people under a company the company, ignores masked numbers and "Contact via website"', () => {
    const rows = [
      ['#', '', 'Company', 'Phone', 'WhatsApp', 'Email', '', '', '', '', 'Key Contact'],
      ['2', '', 'Aramtec LLC', '971 4 347 3455', '=+971 50 XXX XXXX', 'info@aramtec.com', '', '', '', '', 'Contact via website'],
      ['3', '', 'Restofair', 'Dubai: +971 4 333 4575', '', 'online@restofair.ae', '', '', '', '', 'Raphael Saxod'],
      ['', '', '', 'Abu Dhabi: +971 2 550 5911', '', '', '', '', '', '', 'Ashish Sabu'],
    ];
    const [aramtec, raphael, ashish] = readTable(rows, 'AE').candidates;
    assert.equal(aramtec?.name, 'Aramtec LLC');
    assert.equal(aramtec?.phone, '43473455');
    assert.equal(raphael?.role, 'Restofair');
    assert.equal(ashish?.name, 'Ashish Sabu');
    assert.equal(ashish?.role, 'Restofair');
    assert.equal(ashish?.phone, '25505911');
  });
  it('does not tick someone there is no way to reach', () => {
    const { candidates } = readTable([['Name', 'Title'], ['Steve Pyle', 'CEO']], 'AE');
    assert.equal(defaultSelection(candidates).size, 0);
  });
});

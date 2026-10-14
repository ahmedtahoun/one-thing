import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { strToU8, zipSync } from 'fflate';

import { defaultSelection, flagDuplicates, readTable, readVcf } from './columns';
import { parseCsv } from './csv';
import { parseVcf } from './vcf';
import { parseXlsx, parseXlsxSheets } from './xlsx';
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

const file = (name: string, text = '', bytes: Uint8Array = new Uint8Array(), mime: string | null = null) => ({
  name,
  mime,
  text: async () => text,
  bytes: async () => bytes,
});

describe('candidatesFromFile', () => {
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

/** A workbook of several sheets, with the workbook's own list of them. */
function workbook(sheets: { name: string; xml: string }[], strings: string[]): Uint8Array {
  const files: Record<string, Uint8Array> = {
    'xl/sharedStrings.xml': strToU8(`<sst>${strings.map((s) => `<si><t>${s}</t></si>`).join('')}</sst>`),
    'xl/workbook.xml': strToU8(`<workbook><sheets>${sheets.map((s, i) => `<sheet name="${s.name}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`),
    'xl/_rels/workbook.xml.rels': strToU8(
      `<Relationships>${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="x/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}</Relationships>`
    ),
  };
  sheets.forEach((s, i) => (files[`xl/worksheets/sheet${i + 1}.xml`] = strToU8(`<worksheet><sheetData>${s.xml}</sheetData></worksheet>`)));
  return zipSync(files);
}
const str = (ref: string, i: number) => `<c r="${ref}" t="s"><v>${i}</v></c>`;

describe('a workbook with several sheets', () => {
  const strings = ['Name', 'Phone Number', 'Demo Account', 'Sara Haddad', '+971501234567', 'No', 'Demo Patient', '+971500000000', 'Yes', 'Amr', '+200100116187', 'haddad sara', '0501234567'];
  const book = workbook(
    [
      { name: 'Contacts', xml: `<row r="1">${str('A1', 0)}${str('B1', 1)}${str('C1', 2)}</row><row r="2">${str('A2', 3)}${str('B2', 4)}${str('C2', 5)}</row><row r="3">${str('A3', 6)}${str('B3', 7)}${str('C3', 8)}</row>` },
      { name: 'UAE', xml: `<row r="1">${str('A1', 0)}${str('B1', 1)}${str('C1', 2)}</row><row r="2">${str('A2', 11)}${str('B2', 12)}${str('C2', 5)}</row>` },
      { name: 'Egypt', xml: `<row r="1">${str('A1', 0)}${str('B1', 1)}</row><row r="2">${str('A2', 9)}${str('B2', 10)}</row>` },
    ],
    strings
  );
  it('lists the sheets in the workbook’s order, with their names', () => {
    const sheets = parseXlsxSheets(book);
    assert.deepEqual(sheets.map((s) => s.name), ['Contacts', 'UAE', 'Egypt']);
    assert.equal(sheets[2]?.rows[1]?.[0], 'Amr');
  });
  it('reads every sheet, and flags someone who is on two as a repeat of the first, whichever way the number is written', async () => {
    const result = await candidatesFromFile(file('people.xlsx', '', book), [], 'AE');
    assert.ok('candidates' in result);
    const c = result.candidates;
    assert.equal(c.length, 4);
    const second = c.find((x) => x.sheet === 'UAE');
    assert.equal(second?.duplicateIn, 'file');
    assert.equal(second?.duplicateBy, 'phone');
    assert.equal(second?.duplicateOf, 'Sara Haddad');
  });
  it('drops the 0 written after +20, and leaves test accounts unticked', async () => {
    const result = await candidatesFromFile(file('people.xlsx', '', book), [], 'AE');
    assert.ok('candidates' in result);
    const c = result.candidates;
    assert.equal(c.find((x) => x.name === 'Amr')?.phone, '100116187');
    const demo = c.find((x) => x.name === 'Demo Patient');
    assert.ok(demo?.issues.includes('test'));
    const ticked = defaultSelection(c);
    assert.ok(!ticked.has(demo?.key ?? ''));
    assert.equal(ticked.size, 2);
  });
  it('skips hidden rows and a million empty ones without trouble', () => {
    const empty = Array.from({ length: 30000 }, (_, i) => `<row r="${i + 10}" customFormat="1"/>`).join('');
    const rows = parseXlsx(
      xlsx(`<row r="1">${str('A1', 0)}</row><row r="2" hidden="1">${str('A2', 1)}</row><row r="3">${str('A3', 2)}</row>${empty}`, ['Name', 'Hidden one', 'Sara'])
    );
    assert.deepEqual(rows, [['Name'], ['Sara']]);
  });
});

describe('finding the same person twice', () => {
  const sara: Contact = { id: 'c1', name: 'Sara Haddad', phone: '501234567', email: 'sara@x.com', createdAt: '' };
  it('matches a number however it is written', () => {
    assert.equal(flagDuplicates([{ key: 'a', name: 'S. H.', phone: '0501234567', issues: [] }], [sara])[0]?.duplicateBy, 'phone');
  });
  it('matches the same name in another order or case', () => {
    assert.equal(flagDuplicates([{ key: 'a', name: 'HADDAD sara', issues: [] }], [sara])[0]?.duplicateBy, 'name');
  });
  it('matches an email by its case', () => {
    assert.equal(flagDuplicates([{ key: 'a', name: 'Someone', email: 'SARA@x.com', issues: [] }], [sara])[0]?.duplicateBy, 'email');
  });
  it('leaves different people alone', () => {
    assert.equal(flagDuplicates([{ key: 'a', name: 'Omar Khalid', phone: '501234568', issues: [] }], [sara])[0]?.duplicateOf, undefined);
  });
});

describe('people there is no way to reach', () => {
  it('are left out of the list and counted', async () => {
    const result = await candidatesFromFile(file('leads.csv', 'Company,Phone,Email\nNorthwind,0501234567,\nNo Contact Ltd,,\nAl Noor,,hello@alnoor.com'), [], 'AE');
    assert.ok('candidates' in result);
    assert.equal(result.candidates.length, 2);
    assert.equal(result.skipped, 1);
  });
});

describe('a second number, a second email, labels', () => {
  it('keeps the second number and email of a row', () => {
    const rows = [
      ['Name', 'Phone', 'Email', 'Tags'],
      ['Sara Haddad', '+971 55 123 4567, +971 4 320 0101', 'sara@x.com, sara.h@y.com', 'Client, VIP'],
    ];
    const [sara] = readTable(rows, 'AE').candidates;
    assert.equal(sara?.phone, '551234567');
    assert.equal(sara?.dial2, '+971');
    assert.equal(sara?.phone2, '43200101');
    assert.equal(sara?.email, 'sara@x.com');
    assert.equal(sara?.email2, 'sara.h@y.com');
    assert.deepEqual(sara?.labels, ['Client', 'VIP']);
  });
  it('counts the second number when looking for the same person', () => {
    const saved: Contact = { id: 'c1', name: 'Someone', phone: '501111111', phone2: '552222222', createdAt: '' };
    const flagged = flagDuplicates([{ key: 'a', name: 'Another name', phone: '0552222222', issues: [] }], [saved]);
    assert.equal(flagged[0]?.duplicateBy, 'phone');
  });
});

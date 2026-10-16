-- A contact's address or location, from a scanned card or typed on the form.
alter table contact add column address text;

-- A second number and email, and the labels (Client, Lead, Supplier…) a contact carries.
alter table contact add column dial2 text;
alter table contact add column phone2 text;
alter table contact add column email2 text;
alter table contact add column labels text[];

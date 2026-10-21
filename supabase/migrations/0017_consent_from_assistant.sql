-- Where somebody agreed, when the asking moved out of Settings.
--
-- `consent_source` has been 'signin' and 'settings' since 0001, which was
-- every place consent could be given. Sanad asks for `assistant_transcript`
-- itself now, once, after it has been used enough for the question to mean
-- something (BUILD-REVIEW §2.118) — and recording that as 'settings' would
-- make the record say somebody opened a screen they never opened. The point
-- of the column is to be able to say where they agreed.
--
-- **Alone in its file, like 0015.** A new enum value cannot be used in the
-- transaction that added it, so anything that writes 'assistant' belongs in a
-- later execution. Nothing here does; the app writes it after this has been
-- applied. `npm run schema:txn` is the check that holds this rule.

alter type consent_source add value if not exists 'assistant';

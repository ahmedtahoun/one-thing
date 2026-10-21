-- Where somebody agreed, when the asking moved into the welcome.
--
-- `consent_source` was 'signin' and 'settings' in 0001, and gained
-- 'assistant' in 0017 when Sanad started asking for itself. The welcome now
-- asks as well, on its third step, before the first conversation — and that
-- is neither of the other two: it is not the sign-in sheet and it is not
-- somebody who went looking in Settings. The point of the column is to be
-- able to say where they agreed, so it gets its own value.
--
-- **Alone in its file, like 0015 and 0017.** A new enum value cannot be used
-- in the transaction that added it, so anything that writes 'welcome' belongs
-- in a later execution. Nothing here does; the app writes it after this has
-- been applied. `npm run schema:txn` is the check that holds this rule.

alter type consent_source add value if not exists 'welcome';

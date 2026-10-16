# Putting the admin panel online

The panel is a Node.js server, not a set of files. Its server holds the
database connection and checks every sign-in, role and action, so it cannot
be uploaded by FTP like a static site.

It runs on **Vercel**. The domain stays at Namecheap, and only one DNS record
points the subdomain at Vercel.

**Why not the Namecheap shared hosting?** The panel connects to the Supabase
database on port 5432 or 6543, and shared hosts usually block outbound
connections on those ports. Next 16 also needs Node 20.9 or later, which
cPanel's Node.js selector may not offer. If either fails, the panel runs and
then cannot sign anyone in, which is hard to diagnose from cPanel.

**Cost.** Vercel's free Hobby plan is for non-commercial use. A company tool
belongs on Pro, which costs about $20 a month per member.

---

## 1. Collect four values

| Name | Where it comes from |
|---|---|
| `DATABASE_URL` | Supabase → your project → **Connect** → **Transaction pooler** (port 6543). Put the database password in place of `[YOUR-PASSWORD]`, and add `?sslmode=require` to the end. |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://ujcoouwbrkewckpphrod.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → the **anon / publishable** key. Not the service role key. |
| `DATASET_KEY` | A long random string you make once and never change. For example, run `openssl rand -hex 32`, or use any password generator at 40+ characters. It keeps the analytics export pseudonymous. |

Optional:
- `NEXT_PUBLIC_ADMIN_TIME_ZONE`: defaults to `Asia/Riyadh`.
- `LATEST_APP_VERSION`, `APP_STORE_CONNECT_URL` and `PLAY_CONSOLE_URL`: see
  `.env.example`.

**Never set `ADMIN_DEMO`.** Demo mode lets anyone in with any 6-digit code,
and shows sample data instead of yours.

## 2. Create the Vercel project

1. Sign up at **vercel.com** with GitHub, and allow it to see
   `ahmedtahoun/one-thing`.
2. **Add New → Project →** import `one-thing`.
3. **Root Directory: `admin`**. This matters, because the repo also contains
   the mobile app. Vercel then detects Next.js; leave the build settings as
   they are.
4. **Environment Variables:** paste the four values from step 1.
5. **Deploy.** When it finishes, open the `….vercel.app` address it gives
   you. The sign-in page should appear.

From now on, every merge to `main` that touches `admin/` redeploys it.
`vercel.json` keeps the server in Dublin, next to the database in Ireland.

**The code deploys itself; the database does not.** A merge that adds a
migration leaves your Supabase project behind the panel that is now talking
to it, and the panel fails where it reads what is not there yet. § 6 is the
step that closes that gap, and it is not optional.

## 3. Point the subdomain at it

1. In Vercel: **Project → Settings → Domains →** add
   `admin.onething.wheretospot.com`. Vercel then shows the DNS record it
   wants, a **CNAME**.
2. In Namecheap: **Domain List → wheretospot.com → Advanced DNS → Add New
   Record**:
   - Type **CNAME Record**
   - Host **`admin.onething`**
   - Value: what Vercel showed (it ends in `vercel-dns.com`)
   - TTL: Automatic

   If the domain uses Namecheap's hosting nameservers instead of Basic DNS,
   add the same record in **cPanel → Zone Editor**.
3. Wait until Vercel shows the domain as **Valid**. This usually takes
   minutes, at most a few hours. HTTPS is issued automatically.

## 4. Add the first admin (the Owner), from the browser

There is a one-time setup page for this. It needs two more values in
Vercel, both removed again once you are in.

1. In Vercel, go to **Project → Settings → Environment Variables** and add:
   - `ADMIN_SETUP_SECRET`: any password-like word you make up, such as
     `blue-falcon-7731`.
   - `SUPABASE_SERVICE_ROLE_KEY`: from Supabase → Project Settings → API
     Keys, the **service_role / secret** key. Turn on the lock toggle.
     Setup uses it to create your account already confirmed. Otherwise
     Supabase tries to email a confirmation link, and its built-in mailer
     only sends to members of the Supabase team.

   Then go to **Deployments**, open the latest one, choose **⋯ →
   Redeploy**, and wait for it to finish.
2. Open **`https://admin.onething.wheretospot.com/setup`**.
3. Fill in:
   - the setup secret from step 1;
   - your name;
   - an email ending in **`@onlyonething.app`** or **`@wheretospot.com`**
     (it does not need a real mailbox; the panel sends no email);
   - a password of 10 or more characters.

   Then press **Continue**.
4. Scan the QR code with **Google Authenticator, Authy or 1Password**, type
   the 6-digit code the app shows, and press **Finish setup**. You land on
   Overview, signed in as **Owner**.
5. The page now closes itself: `/setup` shows "not found" for everyone.
   **Delete `ADMIN_SETUP_SECRET` from Vercel**, then redeploy. Nothing else
   uses it.

   `SUPABASE_SERVICE_ROLE_KEY` is a choice, not a leftover:

   - **Delete it** and the panel can never set a password. A teammate who
     forgets theirs is reset from the Supabase dashboard, or by emptying
     `admin_member` and running `/setup` again. This is the tighter
     deployment and the one to pick if you are the only admin.
   - **Keep it** and the Owner gets **Team & roles → Reset password**: the
     panel sets a new password and shows it once, for the Owner to hand
     over (BUILD-REVIEW § 2.75). The cost is that the server then holds a
     key which can create, change or delete any account in the project —
     including app users, not only admins. Weigh that against how often
     somebody will be locked out.

   Either way the button is there; without the key it says "Not connected
   yet" and changes nothing.

From then on, sign in at `https://admin.onething.wheretospot.com` with the
email, the password and the code from the app.

**Adding teammates later** (Support or Analyst) still uses the script, from a
computer with Node 20+, with the new person beside you and their
authenticator app ready. Use the **Session pooler** string as
`DATABASE_URL` here, not the Transaction pooler:

```sh
cd admin
npm install
SUPABASE_SERVICE_ROLE_KEY=… DATABASE_URL=… \
NEXT_PUBLIC_SUPABASE_URL=https://ujcoouwbrkewckpphrod.supabase.co \
NEXT_PUBLIC_SUPABASE_ANON_KEY=… \
  npx tsx scripts/add-admin.ts dana@onlyonething.app "Dana Al-Anazi" Support
```

It prints a setup key for their authenticator app ("enter a setup key"),
asks for the 6-digit code it shows, and then prints their password, once.
The service role key is used only on that computer; it never goes into
Vercel.

Admin emails must end in **`@onlyonething.app`** or **`@wheretospot.com`**.
Both are in `ADMIN_EMAIL_DOMAINS` in `src/auth/domains.ts`, which is the one
place to change — the sign-in page, the session check, the setup page and
this script all read that list. Adding a domain is safe; **taking one off
locks out every admin who signs in with it**, at the gate, before their
password is checked.

## 5. Apply new migrations, by hand, before anyone uses the panel

Nothing applies them for you. There is no `supabase db push` in CI, Vercel
only builds the Next.js app, and no job compares your project against
`supabase/migrations/`. When a merge adds one, you apply it.

**How it goes wrong:** the panel queries a column or a table the migration
was going to add, the database says it does not exist, and the screen that
reads it breaks — for everyone, immediately after a deploy that looked
fine. It is not a slow failure.

**Is the project behind?** Each migration leaves something behind that can
be looked for. Supabase → SQL Editor:

```sql
select
  exists (select 1 from information_schema.columns
           where table_name = 'contact' and column_name = 'phone2')    as has_0010,
  exists (select 1 from pg_enum e join pg_type t on t.oid = e.enumtypid
           where t.typname = 'plan_kind' and e.enumlabel = 'pro_plus') as has_0011,
  exists (select 1 from information_schema.tables
           where table_name = 'comp_grant')                            as has_0012;
```

Extend it as migrations are added: pick something each one creates.

**Applying them**

1. Open the files in `supabase/migrations/`, lowest number first.
2. Run **one file per execution** in the SQL Editor. Do not paste two
   together.
3. Watch for an error. Postgres rolls a failed file back whole, so a file
   that errors has changed nothing — fix the cause and run it again.

**Why one at a time, really.** `0011` is
`alter type plan_kind add value 'pro_plus'`, and Postgres will not let a new
enum value be *used* in the same transaction that added it. The SQL Editor
wraps each execution in one transaction, so `0011` and `0012` pasted
together fail with *"invalid input value for enum plan_kind"* — `0012`'s
check constraint naming a value that is not committed yet. Run `0011`, let
it finish, then run `0012`.

**Before any of this**, `npm run schema:check` applies the whole sequence to
a throwaway Postgres, so a migration that cannot apply cleanly is found on a
laptop rather than in production.

## 6. Check it

- Signing in with a non-team email is refused (the message names both
  domains).
- **Team & roles → Reset password** either sets a password or says it needs
  the service role key — whichever you chose above.
- **Overview** shows real counts. They are zero or close to it until the app
  has users.
- **Audit log** has your sign-in.
- Buttons that need an outside service, such as email or the store APIs, say
  "Not connected yet". That is expected.
- **Open a user's record.** It reads the most recently added tables, so it is
  the quickest way to find out that § 5 was skipped.

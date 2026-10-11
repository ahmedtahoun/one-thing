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

## 4. Add the first admin (the Owner)

The design has no "invite" screen. The first admin is added once, from a
computer with Node 20+ and the repo checked out. The new admin must be beside
you with an authenticator app, such as Google Authenticator, 1Password or
Authy.

```sh
cd admin
npm install
SUPABASE_SERVICE_ROLE_KEY=… DATABASE_URL=… \
NEXT_PUBLIC_SUPABASE_URL=https://ujcoouwbrkewckpphrod.supabase.co \
NEXT_PUBLIC_SUPABASE_ANON_KEY=… \
  npx tsx scripts/add-admin.ts you@onlyonething.app "Your Name" Owner
```

It prints a setup secret. The new admin adds it in their authenticator app
("enter a setup key"), then types back the 6-digit code the app shows. The
script then prints their password, once. Sign in at
`https://admin.onething.wheretospot.com` with the email, that password and the
6-digit code. Add Support and Analyst people the same way.

- **The service role key is used only here, on your computer.** It never
  goes into Vercel.
- **Admin emails must end in `@onlyonething.app`**, which is
  `ADMIN_EMAIL_DOMAIN` in `src/config.ts` and `scripts/add-admin.ts`. The
  panel sends no email, so the address does not need a real mailbox. To use
  a different domain, change it in both files.

## 5. Check it

- Signing in with a non-team email is refused.
- **Overview** shows real counts. They are zero or close to it until the app
  has users.
- **Audit log** has your sign-in.
- Buttons that need an outside service, such as email or the store APIs, say
  "Not connected yet". That is expected.

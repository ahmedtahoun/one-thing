# The One Thing — public website

Static pages for the store listings: `/privacy/`, `/terms/`, `/support/`, `/delete/` and a home page.
No build step on the host: upload this folder as-is to Cloudflare Pages, Netlify, Vercel or GitHub Pages,
and point `onlyonething.app` at it. Each page is English with Arabic below it (`#ar` jumps to it).

Privacy and Terms are generated from the app's own text so the two never drift:

```sh
npx tsx scripts/build-site.ts   # rewrites website/ from src/content/strings.ts
```

Before the stores review it, check that `https://onlyonething.app/privacy/`, `/terms/`, `/support/`
and `/delete/` open, and that mail to `privacy@onlyonething.app` is received.

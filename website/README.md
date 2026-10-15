# The One Thing — public website

Static pages for the store listings: `/privacy/`, `/terms/`, `/support/`, `/delete/` and a home page.
Each page is English with Arabic below it (`#ar` jumps to it).

**Published automatically.** `.github/workflows/site.yml` deploys this folder to GitHub Pages on every
push to `main`. It needs Settings → Pages → Source → GitHub Actions set once; after that nobody has to
remember to upload anything. There is no build step on the host — the folder is already the finished
site, so it would serve just as well from Cloudflare Pages, Netlify or Vercel if you ever move it.

Links inside the pages are relative, so they work from the Pages sub-path today and from
`onlyonething.app` the day you point it here. Note that the app's own copy names
`onlyonething.app/delete` out loud, so until the domain is pointed, that in-app link goes nowhere even
though the published page exists.

Privacy and Terms are generated from the app's own text so the two never drift:

```sh
npx tsx scripts/build-site.ts   # rewrites website/ from src/content/strings.ts
```

Before the stores review it, check that `https://onlyonething.app/privacy/`, `/terms/`, `/support/`
and `/delete/` open, and that mail to `privacy@onlyonething.app` is received.

# Websites

One master template for home-service businesses in Southwest Florida:
pressure washing, pool care, lawn care, handyman and mobile detailing.

Each business is one small file in `businesses/`. Every commit to `main`
rebuilds the site on Cloudflare Pages, and each business gets its own link:

    https://<project>.pages.dev/<file-name>/

`businesses/palmetto-demo-wash.json` is a made-up business that shows the
whole template.

## Add a business

1. Copy `businesses/_example.json` to `businesses/<name-with-dashes>.json`.
   The file name becomes the link.
2. Fill it in and commit. The page is live a minute or two later.

The short version of a file:

```json
{
  "status": "preview",
  "name": "Business Name",
  "trade": "pressure-washing",
  "town": "Naples",
  "phone": "(239) 555-0100",
  "services": ["Driveways & pavers", "Roof soft wash", "House wash"],
  "reviews": { "count": 97, "rating": 5.0, "source": "Thumbtack", "url": "https://..." },
  "colors": { "brand": "#0f5c7a", "accent": "#ffb81c" }
}
```

| Field | What it does |
| --- | --- |
| `status` | `preview` (default), `demo` or `live`. See below. |
| `name`, `town` | Required. Shown in the headline, title and footer. |
| `trade` | Required. `pressure-washing`, `pool-care`, `lawn-care`, `handyman` or `mobile-detailing`. |
| `phone` | Ten-digit number. Drives every call button. Leave it out and the call buttons are left off. |
| `services` | List of names. A name that matches one in `trades/<trade>.json` picks up that description; write `{ "name": "...", "note": "..." }` for your own. Left out, the trade's first six are used. |
| `reviews` | `count`, `rating`, `source` and an optional `url` to the real profile. Optional `quotes`: `[{ "text": "...", "name": "..." }]`. |
| `colors` | `brand` is the big color field, `accent` is the buttons. Left out, the trade's colors are used. Text colors are worked out so they stay readable. |
| `freeQuotes` | `true` switches the wording to "free quote". |
| `badges` | Short facts such as `"Licensed and insured"`. Only what the business has actually said. |
| `since`, `hours`, `email`, `tagline`, `lede` | Optional extras. |
| `serviceArea` | List of towns. Left out, the nearest towns to `town` are used. Towns in `template/areas.json` appear on the map. |
| `state` | Defaults to `FL`. |
| `gallery` | The business's own before/after pairs. See Photos. |
| `form` | `{ "endpoint": "https://..." }` posts quote requests there once the page is live. |

### Status

- **preview**: a real business that has not bought yet. Shows a "Preview" note
  at the top, stays out of search engines, and the quote form sends nothing.
- **demo**: a made-up business. Same as preview, and it may use sample reviews.
- **live**: a paying client. No note. The quote form posts to `form.endpoint`,
  or opens a text message to the business's phone when no endpoint is set.

The build refuses to publish sample reviews for a real business, and a live
page only shows before/after photos that belong to that business.

## Photos

`photos/trades/<trade>/` holds one reusable set per trade: three before/after
pairs named `<photo>-before` and `<photo>-after` (`.webp`, `.jpg` or `.png`),
matching the `gallery` list in `trades/<trade>.json`. The files there now are
illustrated stand-ins. Drop a real photo in with the same name and it takes
over. Photos from this set are always labeled "Sample photo".

A business's own photos go in `photos/businesses/<file-name>/` and are listed
in its file:

```json
"gallery": [{ "before": "1-before.jpg", "after": "1-after.jpg", "caption": "Pool deck" }]
```

Use 4:3 photos, about 1200 px wide.

## Build it yourself

    node build.js

Needs Node 22 and nothing else. Output goes to `dist/`. The build stops with
a plain message when a business file has a mistake in it.

`SITE=<file-name> node build.js` builds that one business at the root of the
site, for a client's own domain. Use it as the build command of a second
Cloudflare Pages project connected to this repo.

## Cloudflare Pages settings

| Setting | Value |
| --- | --- |
| Production branch | `main` |
| Framework preset | None |
| Build command | `node build.js` |
| Build output directory | `dist` |

After the first deploy, put the project's address in `settings.json` as
`baseUrl`. `previewContact` in the same file adds a line to the preview note,
for example who to text about the page.

## What is where

    build.js            reads the business files and writes dist/
    settings.json       site-wide settings
    businesses/         one file per business
    trades/             wording, colors and photo list for each trade
    template/           the page (page.js), styles, script, map and fonts
    photos/             trade photo sets and business photos
    tools/              make-samples.js draws the stand-in photos (not part of the build)

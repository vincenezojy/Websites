# Working in this repo

This repo is Vince's website business: one template, one data file per
business, deployed by Cloudflare Pages on every push to `main`. README.md has
the field list and layout.

## Adding or changing a business

- One file per business in `businesses/`, named with lowercase letters,
  numbers and dashes. Start from `businesses/_example.json`.
- Use only facts found on the business's own listings: name, phone, town,
  services, review count and rating, years in business. Leave a field out
  when it cannot be confirmed. Do not invent badges such as "Licensed and
  insured".
- Never write review quotes. `reviews.quotes` holds real quotes from the
  business's own reviews, or nothing. `"sample": true` is for demo pages only.
- A real business that has not bought is `"status": "preview"`.
- Run `node build.js` before committing and fix anything it reports.
- Commit straight to `main`; that is what publishes the page. Tell Vince the
  link: `<baseUrl in settings.json>/<file-name>/`.

## Changing the template

- Plain HTML, CSS and JavaScript. No packages, no framework, no build tools
  beyond `build.js`. The Cloudflare build must keep working with Node alone.
- Colors, wording and photos per trade live in `trades/`. Page structure is
  `template/page.js`; styles are `template/site.css`.
- Check the page at 320, 390 and 1280 px wide before committing a layout
  change. Chrome and Playwright are available in the session for screenshots.
- `tools/make-samples.js` redraws the stand-in photos. It needs Playwright and
  sharp, so it runs in a chat session, not on Cloudflare.

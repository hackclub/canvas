# Canvas (static)

Canvas is over, so this branch is a static site with no backend: the homepage and a page of
every approved submission.

- `app/data/ships.json` — the approved ships, exported from the production database
- `app/data/shop-featured.json` — the shop items on the homepage marquee
- `public/images/` — their banner images, at the same `/images/<key>` paths as before
- `public/img/canvas.png` — the final canvas

```bash
pnpm install
pnpm dev       # local dev server
pnpm generate  # static site in .output/public, deployable to any static host
```

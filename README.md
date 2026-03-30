My personal website, with some heavy Minecraft themes :)

## GitHub Pages (`https://<user>.github.io/personal_site/`)

This app uses Next.js **static export** (`output: 'export'`) with `basePath: '/personal_site'`. Hardcoded `/public` asset URLs must include that prefix (see `lib/assetPrefix.ts`, `app/globals.css` `url()` values, and `.env.production`).

### Deploy

1. In the GitHub repo: **Settings → Pages → Build and deployment → Source**: **GitHub Actions** (not “Deploy from a branch”).
2. Push to `main`. The workflow [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) runs `npm ci`, `npm run lint`, `npm run build`, and publishes the `out/` folder.
3. After the workflow finishes, open `https://jessedill.github.io/personal_site/` and check the browser Network tab for 404s on `/textures/` or `/fonts/`.

### Local preview

- **Development (recommended):** `npm run dev` then open `http://localhost:3000/personal_site/` (matches `basePath`).

- **After `npm run build`:** paths in HTML are absolute (`/personal_site/...`). Serving `out/` at the server root would break those URLs. Either use dev mode above, or wrap the export so the site root is one level up:

```bash
npm run build
rm -rf /tmp/ghpages-preview && mkdir -p /tmp/ghpages-preview && cp -R out /tmp/ghpages-preview/personal_site
npx --yes serve@latest /tmp/ghpages-preview
```

Then open `http://localhost:3000/personal_site/` (port shown in the terminal).

**Note:** On macOS, `serve` from Homebrew may be the wrong package; prefer `npx serve@latest`.

My personal website, with some heavy Minecraft themes :)


### Local preview

- **Development (recommended):** `npm run dev` then open `http://localhost:3000/personal_site/` (matches `basePath`).

- **After `npm run build`:** paths in HTML are absolute (`/personal_site/...`). Serving `out/` at the server root would break those URLs. Either use dev mode above, or wrap the export so the site root is one level up:

```bash
npm run build
rm -rf /tmp/ghpages-preview && mkdir -p /tmp/ghpages-preview && cp -R out /tmp/ghpages-preview/personal_site
npx --yes serve@latest /tmp/ghpages-preview
```

Then open `http://localhost:3000/personal_site/` (port shown in the terminal).


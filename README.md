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

### Performance verification

- Run `npm run verify:optimizations` for the terrain meshing, voxel picking, chunk invalidation, fixture picking, water sleeping, and texture initialization checks.
- Run `npm run build`, then `npm run preview` for the exported production site.
- Add `?perf=1` to the site URL to show the local performance overlay. It reports frame times, renderer work, memory counters, and instrumented CPU timings; diagnostics stay disabled for normal visitors.

# uGame deployment to pre.by

uGame is intentionally a static browser game at this stage. It does not need a backend application process: nginx can serve the repository files directly.

## Recommended development address

Use a dedicated development hostname under `pre.by`, for example `ugame.pre.by`, once DNS and nginx for that hostname are created.

Do not replace the existing `pre.by` site while uGame is still a prototype.

## Files the web root needs

The web root must contain at least:

- `index.html`
- `src/`
- `data/`
- `version.json`

Phaser is currently loaded from jsDelivr, so an internet connection is required by the browser.

## nginx shape

A simple static server block is sufficient. The important behavior is that normal files are served directly and `/` resolves to `index.html`.

No Node process and no `npm install` are required for production serving at the current stage.

## Next deployment step

When the hostname is confirmed, add a deployment workflow with repository secrets for the VPS connection. The intended flow is:

```text
push to main
→ GitHub Actions
→ upload static uGame files to the dedicated server directory
→ atomic replace / sync
→ uGame is available at the development hostname
```

Deployment credentials must stay in GitHub Actions secrets or another protected secret store and must never be committed to this repository.

## Mobile check before public MVP

Before calling the hosted build an MVP, verify at least:

- portrait and landscape phone layouts
- touch movement
- action button
- dash button
- dialogue controls
- zone transitions
- DEV console does not block the game viewport
- no accidental page scrolling or browser zoom conflicts caused by the game UI

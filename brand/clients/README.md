# Client brand packs

Run the content engine for any client — not just the built-in brand — by giving
each one a **brand pack** here. Everything under `brand/clients/<slug>/` (except
this README) is **gitignored**: client colors, logos and GHL config stay local.

## Create a pack

```bash
bash tools/init-client.sh <slug> "Full Client Name"
```

This scaffolds:

```
brand/clients/<slug>/
  graphic.brand.json     # brand colors + asset paths (edit to the brand)
  client.json            # GHL location + scheduling defaults
  assets/fonts/          # the brand's woff2 web fonts (drop them in)
  assets/logo.b64        # the light logo as a data:image/...;base64,... URI
  brand.md               # voice / per-channel caption notes
```

Then:
1. Set the brand colors in `graphic.brand.json`.
2. Add the fonts (`assets/fonts/inter-400.woff2` … `inter-900.woff2`, or the
   client's own family) and the logo (`assets/logo.b64`). Missing fonts fall
   back to a system sans-serif.
3. In `client.json`, set `ghl.locationId` (the client's GHL sub-account) and put
   its Private Integration Token in the repo `.env` under the `ghl.tokenEnv`
   name (e.g. `GHL_TOKEN_ACME=...`).
4. Fill in `brand.md`, `defaultLink`, and the `platforms` list.

## Use a pack

```bash
/graphic-machine --client <slug> topic one, carousel: topic two, topic three
```

The batch resolves the brand, timezone, posting times, default link and target
platforms from the pack, and the publisher routes every post to that client's
GHL location using its token. Account IDs are discovered live per location — no
per-client account IDs to maintain.

`client.json` fields:

| Field | Purpose |
|---|---|
| `name`, `slug` | Display name and folder id |
| `brand` | Brand-token file within the pack (default `graphic.brand.json`) |
| `ghl.locationId` | The client's GHL sub-account location id |
| `ghl.tokenEnv` | Name of the `.env` var holding that location's PIT |
| `timezone` | Scheduling timezone (e.g. `America/Los_Angeles`) |
| `platformTimes` | Per-platform post times (HH:MM local) |
| `defaultLink` | Link used when an item doesn't specify one |
| `platforms` | Default target platforms for this client |

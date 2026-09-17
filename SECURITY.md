# Security

## Secrets

Real credentials live in `.env`, which is git-ignored and must never be committed.
`.env.example` documents the variable names with placeholder values and IS tracked.

| Variable | Purpose |
|---|---|
| `GHL_API_KEY` | GoHighLevel private integration token (social publishing) |
| `GHL_LOCATION_ID` | GHL sub-account location id |
| `ELEVEN_API_KEY` | ElevenLabs TTS (AI voiceover mode only) |

Tools read these from the environment — no credential is ever hardcoded in a tracked file.

## Pre-commit guard

A pre-commit hook blocks commits containing credentials or internal identifiers.

```sh
./scripts/install-hooks.sh      # one command, per clone
```

It sets `core.hooksPath=.githooks`, so the hook is version-controlled and shared.

**What it blocks**

1. **Credential-shaped strings** in added lines — Anthropic, OpenAI, GitHub, AWS,
   Google, Slack, Stripe, GHL tokens, JWTs, PEM private key blocks, bearer tokens,
   and generic `api_key = "…"` assignments.
2. **Filenames** that usually hold secrets — `.env`, `*.pem`, `*.key`, `*.p12`,
   `id_rsa*`, `*credentials.json`, `*service-account*.json`.
3. **Your own internal strings** listed in `.githooks/private-patterns.txt`.

**About that third list.** It is git-ignored by design. In a public repo a tracked
blocklist would publish the very identifiers it exists to protect. Copy
`private-patterns.txt.example` to `private-patterns.txt` and add your values — one
per line, as `label|literal string`, matched case-insensitively.

**False positives.** High-confidence patterns (AWS, GitHub, PEM, …) are never
skipped based on wording — a real key on a line containing the word "example" is
still blocked. To allow a specific line deliberately, append:

```
AKIA1234567890ABCDEF  # pragma: allowlist secret
```

Last resort, for a commit you are certain about: `git commit --no-verify`.

## Reporting

Found something exposed? Rotate the credential first, then open an issue — never
paste the value into the issue.

# Contributing to Automated Content Engine

Thank you for your interest in contributing.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/automated-content-engine.git`
3. Create a branch: `git checkout -b feature/your-feature`
4. Make your changes
5. Test locally with Claude Code: open the repo and run `/edit-video` or `/content-machine`
6. Submit a pull request

## What to Contribute

- **New publisher integrations** — Add support for Buffer, Hootsuite, Later, etc. under `tools/publishers/`
- **New overlay templates** — Add HTML/GSAP templates under `templates/`
- **New agent capabilities** — Improve or extend agents under `.claude/agents/`
- **B-roll prompt library** — Add tested generative prompts to `brand/prompts_library.md`
- **Documentation** — Improve guides, fix typos, add examples

## Guidelines

- Follow the existing code style and directory structure
- Keep brand-specific content in `brand/` — agents and commands should reference brand files, not hardcode values
- All HTML templates must use CSS custom properties (`var(--brand-bg)`, etc.) for colors
- Shell scripts should use relative paths from the repo root
- Test your changes by running the relevant Claude Code commands

## Code of Conduct

Be respectful. Be constructive. Focus on the work.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

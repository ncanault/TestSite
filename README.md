# Evony Alliance Dashboard

## Impeccable design skill

This repo vendors the [Impeccable](https://github.com/pbakaus/impeccable) design-guidance skill for Claude Code.

- `.impeccable/` — the upstream repo as a git submodule (pinned reference, lets you rebuild after updates).
- `.claude/skills/impeccable/`, `.claude/agents/`, `.claude/settings.json` — the built Claude Code skill, commands, and hooks, copied in directly so they work without needing to build the submodule locally.

Once inside a Claude Code session on this repo, run `/impeccable init` to set up `PRODUCT.md`/`DESIGN.md` and start using commands like `/impeccable audit`, `/impeccable critique`, and `/impeccable polish`.

### Updating

```bash
git submodule update --remote .impeccable
cd .impeccable && bun install && bun run build:skills && cd ..
cp -r .impeccable/dist/claude-code/.claude/. .claude/
git add .impeccable .claude
git commit -m "Update Impeccable skill"
```

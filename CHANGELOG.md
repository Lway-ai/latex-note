# Changelog

## Workflow update — 2026-10-23

- Route new and edited circuit schematics through the user's Circuit Draw plugin (`circuit-draw:draw-circuit`), including its independent review workflow.
- Retain editable JSON/SVG and reviewed artwork for LaTeX inclusion; report an unavailable plugin instead of silently substituting another tool. Explicit user tool choices still take precedence.


## Open-source packaging — 2026-10-23

- Add MIT licensing and portable installation instructions.
- Exclude local installation records, backups and generated artifacts from Git.


## 0.2.1 — 2026-10-22

- Add a DeepSeek Harness bundle alongside the Codex and ZCode manifests: `package.json` (`dsh.bundle.patch`), `cordis.patch.yml`, and a zero-dependency `lib/index.js` that registers a bundled skill provider on `ctx.skills`.
- Ship the skill from the package itself (`skills/latex-note`, bundled rank 600) so DSH needs no copy into `~/.dsh/skills`; `resourceBase` keeps `references/`, `assets/main.tex` and `scripts/build_note.py` resolvable through the SKILL.md relative paths.
- Add `scripts/test_dsh_plugin.mjs` (8 tests: frontmatter, discovery, loading, invocation policy, relative resources, abort) and a README section for DSH install/uninstall.
- Install into the desktop profile as `dsh-plugin-latex-note`; record the evidence in `qa/dsh-installation.json`.

## 0.2.0 — 2026-10-22

- Rename the installed plugin from `word-team@personal` to `latex-note@personal`; display name: LaTeX Note.
- Replace the default DOCX/OMML workflow with native XeLaTeX source projects and compiled PDF delivery.
- Use Latin Modern Math, automatic equation/figure numbering and proper inline TeX mathematics.
- Add a portable Chinese template, two-pass build helper, diagnostic checks and rendered PDF review instructions.
- Preserve simulation provenance and the user's explicitly requested output formats. Remove routine outline/style permission gates from the inherited workflow.
- Validate the skill, pass three diagnostic tests, compile the Chinese template twice using the installed helper, render and inspect its page, and match installed runtime-file hashes against source.
- Preserve legacy Word Team sources and local installation backups outside the published files.

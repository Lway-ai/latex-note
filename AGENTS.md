# LaTeX Note

This plugin replaces the Word Team default output with native LaTeX projects and PDFs.

- Read `skills/latex-note/SKILL.md` and its style reference before authoring.
- Preserve the user's existing documents; edit an existing LaTeX project in place after a backup.
- Use native TeX mathematics. Do not route new notes through DOCX, OMML, OfficeCLI or Word font normalization.
- A successful build is necessary but does not replace rendered page inspection.
- Preserve mathematics, dot conventions, units, citations and simulation provenance during conversion.
- Do not infer a successful simulation from a successful document build.
- User-specified formats and typography override plugin defaults.

Legacy Word Team sources are not an active dependency.

## Host layouts

One directory serves three hosts; each host reads only its own manifest.

- **Codex** — `.codex-plugin/plugin.json` with `skills: ./skills/`.
- **ZCode CLI** — `.zcode-plugin/plugin.json`, registered inline through `plugins.dirs`.
- **DeepSeek Harness** — a bundle: `package.json` declares `dsh.bundle.patch`
  (`cordis.patch.yml`), whose one row mounts `lib/index.js`; that module registers a
  skill provider on `ctx.skills` serving the bundled `skills/` directory.

DSH rules that differ from the other hosts:

- The skill is served from the package; never copy it into `~/.dsh/skills`, or the
  same skill name exists twice with unrelated bases.
- `dsh-plugin-latex-note` in `cordis.patch.yml` must equal `package.json`'s `name`.
- Keep `lib/index.js` dependency-free; a linked checkout has no own `node_modules`.
- Install/uninstall: `dsh plugin --profile desktop add|remove "/path/to/latex-note"`.
- After adding or removing bundled skill files, restart DSH so the provider's catalog
  is rebuilt; editing a skill body is picked up on the next `skill` call.

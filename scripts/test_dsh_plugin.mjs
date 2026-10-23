/**
 * Regression tests for the DeepSeek Harness bundle: frontmatter parsing,
 * candidate discovery, skill loading and relative-resource resolution.
 *
 * Run with: node --test scripts/test_dsh_plugin.mjs
 */
import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'

import {
  BUNDLED_SKILL_RANK,
  SKILLS_DIR,
  apply,
  createBundledSkillProvider,
  inject,
  name,
  parseFrontmatter,
} from '../lib/index.js'

const SKILL_FILE = join(SKILLS_DIR, 'latex-note', 'SKILL.md')

/** Create a temporary skills root holding the given files. */
function fixture(files) {
  const root = mkdtempSync(join(tmpdir(), 'latex-note-skills-'))
  for (const [relative, content] of Object.entries(files)) {
    const path = join(root, relative)
    mkdirSync(join(path, '..'), { recursive: true })
    writeFileSync(path, content, 'utf8')
  }
  return root
}

test('plugin name and required service', () => {
  assert.equal(name, 'latex-note')
  assert.deepEqual(inject, ['skills'])
})

test('apply() registers a provider factory on ctx.skills', () => {
  let factory
  const registered = []
  const ctx = {
    skills: {
      registerProvider(create) {
        factory = create
        registered.push(true)
      },
    },
    logger: { warn() {} },
  }
  apply(ctx)
  assert.equal(registered.length, 1)
  assert.equal(typeof factory, 'function')
  const provider = factory({ signal: new AbortController().signal, invalidate() {} })
  assert.equal(provider.name, 'latex-note')
})

test('bundled skill is discovered with the routing metadata the catalog needs', async () => {
  const provider = createBundledSkillProvider()
  const candidates = await provider.list({})
  assert.equal(candidates.length, 1)
  const [candidate] = candidates
  assert.equal(candidate.name, 'latex-note')
  assert.equal(candidate.source, 'bundled')
  assert.equal(candidate.provider, 'latex-note')
  assert.equal(candidate.rank, BUNDLED_SKILL_RANK)
  assert.equal(candidate.path, SKILL_FILE)
  assert.equal(candidate.resourceBase.kind, 'directory')
  assert.equal(candidate.resourceBase.path, join(SKILLS_DIR, 'latex-note'))
  assert.deepEqual(candidate.invocation, { modelInvocable: true, userInvocable: true })
  assert.match(candidate.description, /Chinese technical study notes/u)
  // Frontmatter is routing metadata, never part of the routed description.
  assert.doesNotMatch(candidate.description, /^---/u)
})

test('loading the bundled skill strips frontmatter and keeps the Markdown body', async () => {
  const provider = createBundledSkillProvider()
  const [candidate] = await provider.list({})
  const skill = await provider.get(candidate, {})
  assert.equal(skill.name, 'latex-note')
  assert.equal(skill.source, 'bundled')
  assert.equal(skill.provider, 'latex-note')
  assert.ok(skill.content.startsWith('# LaTeX Note'))
  assert.doesNotMatch(skill.content, /^---/u)
  assert.match(skill.content, /XeLaTeX project/u)
  assert.match(skill.description, /Chinese technical study notes/u)
})

test('relative references in SKILL.md resolve against the skill directory', async () => {
  const provider = createBundledSkillProvider()
  const [candidate] = await provider.list({})
  const skill = await provider.get(candidate, {})
  const base = skill.resourceBase.path
  assert.ok(existsSync(join(base, 'references', 'note-style.md')))
  // SKILL.md tells the agent to read ../../assets/main.tex and ../../scripts/build_note.py.
  assert.ok(existsSync(join(base, '..', '..', 'assets', 'main.tex')))
  assert.ok(existsSync(join(base, '..', '..', 'scripts', 'build_note.py')))
})

test('frontmatter parser handles quoted values, invocation keys and missing frontmatter', () => {
  assert.deepEqual(parseFrontmatter('# not frontmatter'), {
    attributes: expectEmptyAttributes(),
    body: '# not frontmatter',
  })
  const parsed = parseFrontmatter(
    ['---', 'name: demo', 'description: "A quoted: description"', 'disable-model-invocation: true',
      'user-invocable: false', 'metadata:', '  kind: test', '---', '', '# Body', 'text'].join('\n'),
  )
  assert.equal(parsed.attributes.name, 'demo')
  assert.equal(parsed.attributes.description, 'A quoted: description')
  assert.equal(parsed.attributes['disable-model-invocation'], 'true')
  assert.equal(parsed.body, '\n# Body\ntext')
})

test('invalid skills are skipped, and flat Markdown skills are accepted', async (t) => {
  const root = fixture({
    'good-skill/SKILL.md': '---\nname: good-skill\ndescription: Good skill.\n---\n\nBody\n',
    'no-description/SKILL.md': '---\nname: no-description\n---\n\nBody\n',
    'BadName/SKILL.md': '---\nname: BadName\ndescription: Wrong case.\n---\n\nBody\n',
    'flat-skill.md': '---\nname: flat-skill\ndescription: Flat entry.\n---\n\nFlat body\n',
  })
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const warnings = []
  const provider = createBundledSkillProvider({ skillsDir: root, onWarn: (message) => warnings.push(message) })
  const candidates = await provider.list({})
  assert.deepEqual(candidates.map((candidate) => candidate.name), ['flat-skill', 'good-skill'])
  assert.ok(warnings.some((warning) => warning.includes('description is required')))
  assert.ok(warnings.some((warning) => warning.includes('kebab-case')))
  const read = await provider.get(candidates[0], {})
  assert.equal(read.content.trim(), 'Flat body')
})

test('aborted lookups settle without reading the filesystem', async () => {
  const provider = createBundledSkillProvider()
  const aborted = new AbortController()
  aborted.abort()
  assert.deepEqual(await provider.list({ signal: aborted.signal }), [])
  assert.equal(await provider.get({ locator: SKILL_FILE }, { signal: aborted.signal }), undefined)
})

/** Attributes are null-prototype maps; compare them as plain entries. */
function expectEmptyAttributes() {
  return Object.assign(Object.create(null), {})
}

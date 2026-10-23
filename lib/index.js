/**
 * dsh-plugin-latex-note — bundled LaTeX Note skill for the DeepSeek Harness.
 *
 * Mounting this plugin registers a skill provider on `ctx.skills` that serves the
 * `skills/` directory shipped inside the package. The LaTeX Note skill then shows up
 * in the agent's skill catalog with no copy step into a skills root, and its
 * `references/`, `assets/` and `scripts/` trees stay beside it so the relative paths
 * written in SKILL.md resolve exactly as documented.
 *
 * Discovery is one level deep, matching the format the skills are written in:
 * `<skillsDir>/<name>/SKILL.md` directory bundles (which may carry their own
 * `references/` tree) and flat `<skillsDir>/<name>.md` files. Candidates report the
 * bundled rank (600), so an installer's own project or user skill wins a name
 * collision instead of being shadowed by the package.
 *
 * The plugin has no runtime dependencies: the provider interface is a plain object
 * and the frontmatter reader is local, so a linked checkout and an npm install
 * behave the same way.
 *
 * @module dsh-plugin-latex-note
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Cordis plugin name, also the name of the skill provider it registers. */
export const name = 'latex-note'

/** Services this plugin requires before `apply` runs. */
export const inject = ['skills']

/** Precedence rank for packaged skill providers and local bundled roots. */
export const BUNDLED_SKILL_RANK = 600

/** Provider name registered on `ctx.skills`. */
const PROVIDER_NAME = name

/** Directory holding the bundled skills, relative to this module. */
export const SKILLS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'skills')

/** File name of a directory-bundle skill. */
const SKILL_FILE = 'SKILL.md'

/** Public skill-name grammar: lowercase kebab-case. */
const SKILL_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u

/** A top-level `key: value` frontmatter line. */
const ATTRIBUTE_LINE = /^(?<key>[A-Za-z0-9_-]+):(?:[ \t]+(?<value>.*))?$/u

/**
 * Strip a UTF-8 byte-order mark.
 * @param value - text to normalize.
 * @returns the text without a leading BOM.
 */
function stripBom(value) {
  return value.charCodeAt(0) === 0xfeff ? value.slice(1) : value
}

/**
 * Read one YAML scalar with the quoting rules skill frontmatter uses.
 * Plain scalars are returned trimmed and otherwise verbatim; single- and
 * double-quoted scalars lose their quotes and use YAML's escape for the
 * quote character itself.
 * @param raw - the text after the colon.
 * @returns the scalar as a string.
 */
function parseScalar(raw) {
  const value = raw.trim()
  if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
    try {
      return JSON.parse(value)
    } catch {
      return value.slice(1, -1).replaceAll('\\"', '"')
    }
  }
  if (value.length >= 2 && value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1).replaceAll("''", "'")
  }
  return value
}

/**
 * Read the top-level attributes of a frontmatter block.
 * Nested blocks (`metadata:` and friends) and indented continuation lines are
 * skipped: the provider only needs the routing fields, and the blocks are
 * returned to the caller as raw body text.
 * @param lines - frontmatter lines between the delimiters.
 * @returns the attribute map.
 */
function parseAttributes(lines) {
  const attributes = Object.create(null)
  let index = 0
  while (index < lines.length) {
    const line = lines[index]
    index += 1
    const trimmed = line.trim()
    if (trimmed === '' || trimmed.startsWith('#')) continue
    // Indented lines belong to the previous key's nested block.
    if (/^[ \t]/u.test(line)) continue
    const match = ATTRIBUTE_LINE.exec(line)
    if (match === null || match.groups === undefined) continue
    const value = match.groups.value
    if (value === undefined || value === '' || value === '|' || value === '>' ||
      /^[|>][+-]?$/u.test(value)) {
      // A nested block or block scalar: skip its indented continuation lines.
      while (index < lines.length && (/^[ \t]/u.test(lines[index]) || lines[index].trim() === '')) {
        index += 1
      }
      if (value === '|' || value === '>') attributes[match.groups.key] = ''
      continue
    }
    attributes[match.groups.key] = parseScalar(value)
  }
  return attributes
}

/**
 * Split a skill file into its YAML frontmatter attributes and Markdown body.
 * @param text - complete skill file text.
 * @returns parsed attributes and the body with the frontmatter removed.
 */
export function parseFrontmatter(text) {
  const normalized = stripBom(text)
  const lines = normalized.split(/\r?\n/u)
  if ((lines[0] ?? '').trim() !== '---') return { attributes: Object.create(null), body: normalized }
  let end = -1
  for (let index = 1; index < lines.length; index += 1) {
    const marker = lines[index].trim()
    if (marker === '---' || marker === '...') {
      end = index
      break
    }
  }
  if (end === -1) return { attributes: Object.create(null), body: normalized }
  return {
    attributes: parseAttributes(lines.slice(1, end)),
    body: lines.slice(end + 1).join('\n'),
  }
}

/**
 * Report whether a value is a valid kebab-case skill name.
 * @param value - candidate name.
 * @returns whether the name matches the public grammar.
 */
function isSkillName(value) {
  return typeof value === 'string' && SKILL_NAME.test(value)
}

/**
 * Read one frontmatter boolean, accepting the YAML spellings only.
 * @param value - attribute value.
 * @param fallback - value used when the attribute is absent or not boolean.
 * @returns the resolved boolean.
 */
function readBoolean(value, fallback) {
  if (value === true || value === 'true') return true
  if (value === false || value === 'false') return false
  return fallback
}

/**
 * Resolve the invocation policy from the same frontmatter keys the local
 * filesystem provider uses.
 * @param attributes - parsed frontmatter attributes.
 * @returns the normalized invocation policy.
 */
function invocationPolicy(attributes) {
  return {
    modelInvocable: !readBoolean(attributes['disable-model-invocation'], false),
    userInvocable: readBoolean(attributes['user-invocable'], true),
  }
}

/**
 * Enumerate the skill files under a bundled skills directory.
 * @param skillsDir - absolute path to the bundled skills root.
 * @param warn - warning sink.
 * @returns discovered skill files with their resource directory.
 */
function discover(skillsDir, warn) {
  let dirents
  try {
    dirents = readdirSync(skillsDir, { withFileTypes: true })
  } catch (error) {
    warn(`cannot read bundled skills directory ${skillsDir}: ${error.message}`)
    return []
  }
  const found = []
  for (const dirent of dirents) {
    const full = join(skillsDir, dirent.name)
    if (dirent.isDirectory()) {
      const file = join(full, SKILL_FILE)
      try {
        if (statSync(file).isFile()) found.push({ dir: full, file })
      } catch {
        warn(`skipping ${dirent.name}: no ${SKILL_FILE}`)
      }
      continue
    }
    if (dirent.isFile() && dirent.name.endsWith('.md') && dirent.name !== SKILL_FILE) {
      found.push({ dir: skillsDir, file: full })
    }
  }
  return found
}

/**
 * Read and validate one skill file into a provider candidate.
 * @param entry - discovered skill file.
 * @param warn - warning sink.
 * @returns a candidate, or `undefined` when the file is unusable.
 */
function readCandidate(entry, warn) {
  let parsed
  try {
    parsed = parseFrontmatter(readFileSync(entry.file, 'utf8'))
  } catch (error) {
    warn(`skipping ${entry.file}: ${error.message}`)
    return undefined
  }
  const { attributes } = parsed
  const skillName = typeof attributes.name === 'string' ? attributes.name.trim() : ''
  if (!isSkillName(skillName)) {
    warn(`skipping ${entry.file}: name must be kebab-case, got ${JSON.stringify(attributes.name)}`)
    return undefined
  }
  if (entry.file === join(entry.dir, SKILL_FILE) && basename(entry.dir) !== skillName) {
    warn(`${skillName}: directory name ${basename(entry.dir)} differs from frontmatter name (frontmatter wins)`)
  }
  const description = typeof attributes.description === 'string' ? attributes.description.trim() : ''
  if (description === '') {
    warn(`skipping ${skillName}: description is required`)
    return undefined
  }
  const whenToUse = typeof attributes.whenToUse === 'string' ? attributes.whenToUse.trim() : undefined
  return {
    name: skillName,
    ...(whenToUse === undefined || whenToUse === '' ? {} : { whenToUse }),
    description,
    invocation: invocationPolicy(attributes),
    source: 'bundled',
    provider: PROVIDER_NAME,
    rank: BUNDLED_SKILL_RANK,
    path: entry.file,
    resourceBase: { kind: 'directory', path: entry.dir },
    locator: entry.file,
  }
}

/**
 * Create the bundled skill provider registered on `ctx.skills`.
 * @param options - provider options.
 * @param options.skillsDir - absolute path to the bundled skills root.
 * @param {(message: string) => void} [options.onWarn] - warning sink.
 * @returns the provider object accepted by `ctx.skills.registerProvider()`.
 */
export function createBundledSkillProvider(options = {}) {
  const { skillsDir = SKILLS_DIR, onWarn } = options
  const warn = typeof onWarn === 'function' ? onWarn : () => {}
  let catalog

  /**
   * Build (once) the validated candidate catalog.
   * @returns candidates sorted by name.
   */
  function candidates() {
    if (catalog === undefined) {
      catalog = discover(skillsDir, warn)
        .map((entry) => readCandidate(entry, warn))
        .filter((candidate) => candidate !== undefined)
        .sort((left, right) => left.name.localeCompare(right.name))
    }
    return catalog
  }

  return {
    name: PROVIDER_NAME,

    /**
     * List every bundled skill for the current lookup.
     * @param {{ signal?: AbortSignal }} [lookup] - lookup options.
     * @returns the provider candidates.
     */
    list(lookup) {
      if (lookup?.signal?.aborted === true) return Promise.resolve([])
      return Promise.resolve(candidates().map((candidate) => ({ ...candidate })))
    },

    /**
     * Load one bundled skill body for a previously listed candidate.
     * @param {object} candidate - a candidate returned by `list`.
     * @param {{ signal?: AbortSignal }} [lookup] - lookup options.
     * @returns the complete definition, or `undefined` when the file is gone.
     */
    get(candidate, lookup) {
      if (lookup?.signal?.aborted === true) return Promise.resolve(undefined)
      const locator = typeof candidate?.locator === 'string' ? candidate.locator : undefined
      if (locator === undefined) return Promise.resolve(undefined)
      let parsed
      try {
        parsed = parseFrontmatter(readFileSync(locator, 'utf8'))
      } catch (error) {
        warn(`cannot load ${candidate.name}: ${error.message}`)
        return Promise.resolve(undefined)
      }
      const { attributes, body } = parsed
      const skillName = typeof attributes.name === 'string' ? attributes.name.trim() : candidate.name
      const description = typeof attributes.description === 'string' && attributes.description.trim() !== ''
        ? attributes.description.trim()
        : candidate.description
      const whenToUse = typeof attributes.whenToUse === 'string' && attributes.whenToUse.trim() !== ''
        ? attributes.whenToUse.trim()
        : candidate.whenToUse
      return Promise.resolve({
        name: skillName,
        description,
        ...(whenToUse === undefined ? {} : { whenToUse }),
        invocation: invocationPolicy(attributes),
        source: 'bundled',
        provider: PROVIDER_NAME,
        path: candidate.path,
        resourceBase: candidate.resourceBase,
        content: body.replace(/^[ \t]*\r?\n/u, ''),
      })
    },
  }
}

/**
 * Emit a warning through the host logging surface, falling back to the console.
 * @param ctx - cordis context.
 * @param message - warning text.
 */
function warnThroughHost(ctx, message) {
  try {
    const logger = typeof ctx?.logger === 'function' ? ctx.logger(PROVIDER_NAME) : ctx?.logger
    if (logger != null && typeof logger.warn === 'function') {
      logger.warn(message)
      return
    }
  } catch {
    /* fall through to the console */
  }
  try {
    console.warn(`[${PROVIDER_NAME}] ${message}`)
  } catch {
    /* nothing left to report to */
  }
}

/**
 * Register the bundled skill provider on `ctx.skills`.
 * @param ctx - cordis context carrying the `skills` service.
 */
export function apply(ctx) {
  ctx.skills.registerProvider(() => createBundledSkillProvider({
    skillsDir: SKILLS_DIR,
    onWarn: (message) => warnThroughHost(ctx, message),
  }))
}

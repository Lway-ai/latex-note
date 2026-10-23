---
name: latex-note
description: Create, extend, convert or review Chinese technical study notes as editable native LaTeX projects with compiled PDF delivery. Use for study notes, derivations and equation-heavy RF or analog-circuit notes, including conversion from Word. Respect explicitly requested Word or PowerPoint output instead of overriding it.
---

# LaTeX Note

Default deliverable: a self-contained XeLaTeX project (`main.tex`, relative figures and any bibliography), a compiled PDF, and a concise validation record. This is the successor to Word Team; ordinary requests to make or continue study notes now produce LaTeX directly.

## Author and continue

1. Inspect the actual source material and any existing note project. Read [the style contract](references/note-style.md). Keep existing content and accepted style unless changes are requested.
2. For a new note, create a dedicated folder under the current working directory. When available, use `create_latex_project` and set up its main document from `../../assets/main.tex`. For existing projects, edit in place and preserve a timestamped backup before broad changes. Keep project-specific decisions in `agend.md`.
3. Write Chinese prose and native LaTeX equations. Use `equation`, `align`, `aligned`, `subequations`, labels and references for actual structure. Do not generate OMML, manually style individual math characters, or rasterize equations. Avoid whole-document conversion that silently flattens fractions, radicals or subscripts.
4. Keep figures and supporting sources in the project with relative paths. Use the user's requested circuit-drawing tool when drawing new circuits; existing diagrams can be reused without redrawing. Separate a paper's reported numbers, teaching examples and actual simulator output. If simulation is requested, run the requested simulator and retain netlists, logs and numerical comparison evidence.
5. Compile and inspect. Prefer the built-in compiler for the project and open the project folder for source editing and live preview. If the compiler is unavailable, times out, or cannot support the required fonts/packages, keep sources and use local XeLaTeX when available. The bundled `../../scripts/build_note.py` runs two passes, checks common build failures, renders a PDF with Poppler if available, and writes machine-readable evidence. Run it with `--help` for options.
6. Check every final page image for typography, formula alignment, numbering, readable legends, clipped diagrams, blank pages and orphan endings. Fix issues and rebuild. Check source completeness and mathematical semantics against the inputs. A machine check does not certify technical truth or visual quality.
7. Deliver the main `.tex`, PDF and optionally a clean source ZIP. Include all referenced figures in the ZIP. After all checks pass, open the final PDF with the system default viewer so the user can inspect it immediately (Windows: `cmd /c start "" main.pdf`; macOS: `open main.pdf`; Linux: `xdg-open main.pdf`). State any compiler limitations, unresolved warnings or simulation work not rerun. Finish routine reversible work without adding outline/style permission gates.

## Convert existing Word notes

Read the actual DOCX ZIP/XML or use an available document reader. Enumerate headings, paragraphs, tables, images, editable equations, links and references before conversion. Preserve originals. Reconstruct OMML equations semantically in TeX; do not use extracted linear equation text as proof that fractions or radicals survived. Compare section, figure and equation inventories with the source. Preserve captions and provenance; make inline variables proper math too.

## Review-only

For a review request, inspect without editing. Distinguish measured build/layout findings from technical inferences. Do not label a PDF accepted merely because its compilation or automated checks passed.

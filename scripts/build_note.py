"""Compile a saved XeLaTeX project, check diagnostics, optionally render pages."""
from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path


def diagnostics(log: str) -> list[str]:
    patterns = [
        r"^!.*$",
        r"^Missing character:.*$",
        r"^Overfull \\[hv]box.*$",
        r"^LaTeX Warning: (?:Reference|Citation).*?undefined.*$",
        r"^LaTeX Warning: There were undefined (?:references|citations).*$",
        r"^LaTeX Warning: Label .*?multiply defined.*$",
        r"^LaTeX Warning: There were multiply-defined labels.*$",
    ]
    return list(dict.fromkeys(
        match.group(0) for pattern in patterns
        for match in re.finditer(pattern, log, flags=re.MULTILINE)
    ))


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("main", type=Path, help="Path to main.tex or a folder containing main.tex")
    parser.add_argument("--engine", default="xelatex", help="XeLaTeX executable or absolute path")
    parser.add_argument("--render", action="store_true", help="Render PDF pages with pdftoppm")
    parser.add_argument("--timeout", type=int, default=60, help="Seconds allowed per compilation pass")
    args = parser.parse_args()
    source = args.main.resolve()
    if source.is_dir():
        source = source / "main.tex"
    if not source.is_file() or source.suffix.lower() != ".tex":
        parser.error("Provide an existing .tex file or a project folder with main.tex")
    engine = shutil.which(args.engine)
    if not engine:
        parser.error(f"XeLaTeX executable unavailable: {args.engine}")
    qa = source.parent / "qa"
    qa.mkdir(exist_ok=True)
    report = {"main": str(source), "engine": engine, "passes": [], "issues": [],
              "pdf": str(source.with_suffix('.pdf')), "rendered_pages": [],
              "visual_review": "pending; inspect final rendered pages separately"}
    report_path = qa / "build.json"

    def finish(code: int) -> int:
        report["success"] = code == 0
        report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")
        print(json.dumps(report, ensure_ascii=True, indent=2))
        return code

    for index in range(1, 3):
        try:
            run = subprocess.run(
                [engine, "-interaction=nonstopmode", "-halt-on-error", source.name],
                cwd=source.parent, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                timeout=args.timeout,
            )
        except subprocess.TimeoutExpired:
            report["issues"].append(f"Compilation pass {index} exceeded {args.timeout}s")
            return finish(1)
        (qa / f"compile-{index}.txt").write_bytes(run.stdout)
        report["passes"].append({"pass": index, "exit_code": run.returncode})
        if run.returncode:
            report["issues"].append(f"Compilation pass {index} failed; inspect qa/compile-{index}.txt")
            return finish(1)
    log = source.with_suffix(".log").read_text(encoding="utf-8", errors="replace")
    report["issues"].extend(diagnostics(log))
    report["warnings"] = re.findall(r"^.*Warning:.*$", log, flags=re.MULTILINE)
    if not source.with_suffix(".pdf").exists():
        report["issues"].append("Compiler produced no PDF")
    if report["issues"]:
        return finish(1)
    if args.render:
        poppler = shutil.which("pdftoppm")
        if not poppler:
            report["issues"].append("Rendering requested but pdftoppm is unavailable")
            return finish(1)
        # A fresh render folder avoids stale pages from an earlier longer PDF.
        import tempfile
        render_dir = Path(tempfile.mkdtemp(prefix="pages-", dir=qa))
        try:
            run = subprocess.run(
                [poppler, "-png", "-r", "130", str(source.with_suffix('.pdf')), str(render_dir / "page")],
                stdout=subprocess.PIPE, stderr=subprocess.STDOUT, timeout=args.timeout,
            )
        except subprocess.TimeoutExpired:
            report["issues"].append("PDF page rendering timed out")
            return finish(1)
        report["rendered_pages"] = [str(p) for p in sorted(render_dir.glob("page-*.png"))]
        if run.returncode or not report["rendered_pages"]:
            report["issues"].append("PDF page rendering failed")
    return finish(1 if report["issues"] else 0)


if __name__ == "__main__":
    sys.exit(main())

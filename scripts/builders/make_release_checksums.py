#!/usr/bin/env python3
"""make_release_checksums.py

Creates a SHA256 checksum file for a set of release artifacts.

Usage:
  python3 make_release_checksums.py --out CHECKSUMS.sha256 file1 file2 ...
"""

from __future__ import annotations

import argparse
import hashlib
from pathlib import Path


def sha256_file(p: Path) -> str:
    h = hashlib.sha256()
    with p.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="CHECKSUMS.sha256", help="output checksum file")
    ap.add_argument("files", nargs="+", help="files to hash")
    args = ap.parse_args(argv)

    out = Path(args.out)
    lines: list[str] = []
    for f in args.files:
        p = Path(f)
        if not p.exists() or not p.is_file():
            raise SystemExit(f"Missing file: {p}")
        lines.append(f"{sha256_file(p)}  {p.name}")
    out.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Wrote {out} ({len(lines)} files)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

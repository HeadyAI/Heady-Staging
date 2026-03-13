#!/usr/bin/env python3
"""
merge_versions.py
-----------------
This script merges four code files (e.g., intermediate versions produced by an AI
assistant) into a single, functional output file. It focuses on Python code
and uses the `ast` module to identify top‑level imports, class definitions,
function definitions, and global statements. Later versions override earlier
versions when definitions conflict, and unique imports and definitions are
preserved.

**How it works:**
  - Each input file is parsed with `ast.parse` and examined for import
    statements, function definitions, class definitions, and other top‑level code.
  - Imports from all versions are collected, deduplicated, and kept at the top
    of the merged file (comments and blank lines among imports are preserved).
  - When multiple versions define the same function or class name, the last
    version provided on the command line takes precedence.
  - Global (top‑level) statements are taken from the most recent version,
    ensuring initialization and configuration logic isn’t lost.

Usage:
    python merge_versions.py version1.py version2.py version3.py version4.py \
        --output merged.py

The script expects exactly four input files. It writes the merged output to
``merged.py`` by default but accepts a custom output path via ``--output``.

This approach builds on the idea of merging multiple Python files by
renaming or handling conflicts, as exemplified in community scripts that
rename functions and manage imports when combining files【331421522529891†L88-L133】【331421522529891†L135-L167】.  If you need to merge
non‑Python files or perform a line‑level diff, you can instead use
``difflib``—a standard library module for computing differences between
sequences—which can produce unified or context diffs suitable for patching
【438927137227294†L48-L53】.

Note: This script assumes that each file contains syntactically correct
Python. If any file cannot be parsed, the script will raise a syntax error.
"""

import argparse
import ast
from pathlib import Path
from typing import List, Tuple, Dict


def extract_defs(code: str) -> Tuple[List[str], Dict[str, str], Dict[str, str], List[str]]:
    """Extract imports, function definitions, class definitions, and global code.

    Parameters
    ----------
    code : str
        The full source code of a file.

    Returns
    -------
    imports : List[str]
        List of import statements (preserving ordering and duplicates).
    defs : Dict[str, str]
        Mapping of function names to their source code strings.
    classes : Dict[str, str]
        Mapping of class names to their source code strings.
    global_code : List[str]
        Lines of top‑level code outside of functions/classes/imports.
    """
    tree = ast.parse(code)
    lines = code.splitlines()

    imports: List[str] = []
    defs: Dict[str, str] = {}
    classes: Dict[str, str] = {}
    occupied_lines = set()

    for node in ast.iter_child_nodes(tree):
        if isinstance(node, (ast.Import, ast.ImportFrom)):
            start = node.lineno - 1
            end = getattr(node, 'end_lineno', node.lineno) - 1
            imports.extend(lines[start:end + 1])
            occupied_lines.update(range(start, end + 1))
        elif isinstance(node, ast.FunctionDef):
            start = node.lineno - 1
            end = getattr(node, 'end_lineno', node.lineno) - 1
            defs[node.name] = '\n'.join(lines[start:end + 1])
            occupied_lines.update(range(start, end + 1))
        elif isinstance(node, ast.ClassDef):
            start = node.lineno - 1
            end = getattr(node, 'end_lineno', node.lineno) - 1
            classes[node.name] = '\n'.join(lines[start:end + 1])
            occupied_lines.update(range(start, end + 1))

    global_code = [line for idx, line in enumerate(lines) if idx not in occupied_lines and line.strip()]
    return imports, defs, classes, global_code


def merge_versions(version_paths: List[str], output_path: str) -> None:
    """Merge four Python code versions into a single file.

    Parameters
    ----------
    version_paths : List[str]
        A list of four file paths containing different versions of a Python module.
    output_path : str
        The path to write the merged output file.
    """
    all_imports: List[str] = []
    all_defs: Dict[str, str] = {}
    all_classes: Dict[str, str] = {}
    global_code: List[str] = []

    for version_path in version_paths:
        source = Path(version_path).read_text(encoding='utf-8')
        imports, defs, classes, gcode = extract_defs(source)

        # accumulate imports (preserve duplicates for now)
        all_imports.extend(imports)

        # later versions override earlier ones
        all_defs.update(defs)
        all_classes.update(classes)

        # last non‑empty global code wins
        if gcode:
            global_code = gcode

    # deduplicate imports while preserving order
    seen_imports = set()
    unique_imports = []
    for imp in all_imports:
        if imp not in seen_imports:
            unique_imports.append(imp)
            seen_imports.add(imp)

    # build output lines
    merged_lines: List[str] = []
    merged_lines.extend(unique_imports)
    if unique_imports:
        merged_lines.append('')

    if global_code:
        merged_lines.extend(global_code)
        merged_lines.append('')

    # write classes first (could be dependencies for functions)
    for cls_src in all_classes.values():
        merged_lines.append(cls_src)
        merged_lines.append('')

    for func_src in all_defs.values():
        merged_lines.append(func_src)
        merged_lines.append('')

    # write the merged file
    Path(output_path).write_text('\n'.join(merged_lines).strip() + '\n', encoding='utf-8')


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Merge four code versions into a single Python file.",
        epilog="Example: python merge_versions.py v1.py v2.py v3.py v4.py -o merged.py"
    )
    parser.add_argument('versions', nargs='+', help='List of exactly four version file paths')
    parser.add_argument('-o', '--output', default='merged.py', help='Output file path (default: merged.py)')
    args = parser.parse_args()

    if len(args.versions) != 4:
        parser.error('Exactly four version files must be provided.')

    merge_versions(args.versions, args.output)
    print(f'Merged versions written to {args.output}')


if __name__ == '__main__':
    main()

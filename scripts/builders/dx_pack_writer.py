#!/usr/bin/env python3
"""
dx_pack_writer.py

Reads a canonical markdown source file (DX_SOURCE.md) and materializes 
the Heady DX Pack file structure into the target repository.

Features:
- Splits Onboarding Checklist into lifecycle documents (Day 1, Week 1, Month 1).
- Generates GitHub Issue/PR templates (preserves Markdown format).
- Generates Style Guides and Contributing docs.
- Idempotent: safe to run repeatedly.

Usage:
  python3 dx_pack_writer.py --source docs_source/DX_SOURCE.md --dest .
"""

import argparse
import re
import sys
from pathlib import Path
from typing import Dict

def log(msg: str):
    print(f"[dx-pack] {msg}")

def ensure_dir(path: Path):
    path.mkdir(parents=True, exist_ok=True)

def write_file(path: Path, content: str):
    ensure_dir(path.parent)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content.strip() + '\n')
    log(f"Wrote {path}")

def parse_source_sections(source_path: Path) -> Dict[str, str]:
    """
    Parses the source markdown into a dictionary of {Title: Content}.
    Splits by H1 headers (# Title).
    """
    if not source_path.exists():
        log(f"Error: Source file {source_path} not found.")
        sys.exit(1)

    with open(source_path, 'r', encoding='utf-8') as f:
        text = f.read()

    # Regex to split by top-level headers (# Header)
    # capturing the header title and the following content.
    pattern = re.compile(r'^#\s+(.+)$', re.MULTILINE)
    parts = pattern.split(text)

    sections = {}
    # parts[0] is everything before the first header (preamble)
    # parts[1] is title 1, parts[2] is content 1, etc.
    for i in range(1, len(parts), 2):
        title = parts[i].strip()
        content = parts[i+1].strip()
        sections[title] = content
    
    return sections

def process_onboarding(content: str, dest_root: Path):
    """
    Splits the massive Onboarding Checklist into lifecycle-specific files.
    """
    base_dir = dest_root / "docs/onboarding"
    
    # Regex to find H2 headers like "## First Day"
    # Note: Includes handling for non-breaking hyphens found in input text
    header_map = {
        "Pre‑onboarding": "DEVELOPER_ONBOARDING.md",
        "Pre-onboarding": "DEVELOPER_ONBOARDING.md",
        "First Day": "DEVELOPER_ONBOARDING.md", 
        "Week 1": "FIRST_WEEK.md",
        "First Month": "FIRST_MONTH.md",
        "Ongoing": "FIRST_MONTH.md" 
    }

    # Default file for generic content
    current_file = "DEVELOPER_ONBOARDING.md"
    
    file_buffers = {
        "DEVELOPER_ONBOARDING.md": ["# Developer Onboarding: Day 1\n"],
        "FIRST_WEEK.md": ["# Developer Onboarding: First Week\n"],
        "FIRST_MONTH.md": ["# Developer Onboarding: First Month & Beyond\n"]
    }

    lines = content.split('\n')
    
    for line in lines:
        stripped = line.strip()
        
        # Check if line matches a known section header (H2 or plain text)
        matched = False
        for header_key, target_file in header_map.items():
            # Check for "## Header" or just "Header"
            if stripped.lower().startswith(f"## {header_key.lower()}") or \
               stripped.lower() == header_key.lower():
                current_file = target_file
                # Normalize header level to H2 for the output file
                line = f"## {header_key}" 
                matched = True
                break
        
        file_buffers[current_file].append(line)

    # Write the buffers
    for filename, lines_buffer in file_buffers.items():
        full_content = "\n".join(lines_buffer)
        write_file(base_dir / filename, full_content)

def process_issue_templates(sections: Dict[str, str], dest_root: Path):
    """
    Writes GitHub issue templates.
    Expects headers like 'Issue Template: bug_report.md' in source.
    """
    template_dir = dest_root / ".github/ISSUE_TEMPLATE"
    
    for title, content in sections.items():
        if title.lower().startswith("issue template:"):
            # Extract filename from title, e.g. "Issue Template: bug_report.md" -> "bug_report.md"
            filename = title.split(":", 1)[1].strip()
            write_file(template_dir / filename, content)

def main():
    parser = argparse.ArgumentParser(description="Heady DX Pack Materializer")
    parser.add_argument("--source", required=True, type=Path, help="Path to canonical DX_SOURCE.md")
    parser.add_argument("--dest", required=True, type=Path, help="Target repository root")
    args = parser.parse_args()

    sections = parse_source_sections(args.source)
    
    # 1. Onboarding
    onboarding_key = next((k for k in sections if "onboarding checklist" in k.lower()), None)
    if onboarding_key:
        log("Processing Onboarding Checklist...")
        process_onboarding(sections[onboarding_key], args.dest)
    
    # 2. Contributing
    if "Contributing Guide" in sections:
        log("Processing Contributing Guide...")
        write_file(args.dest / "docs/contributing/CONTRIBUTING.md", sections["Contributing Guide"])

    # 3. Release Notes Template
    release_key = next((k for k in sections if k.startswith("Release Notes – Version")), None)
    if release_key:
        log("Processing Release Notes Template...")
        write_file(args.dest / "docs/releases/RELEASE_NOTES_TEMPLATE.md", sections[release_key])

    # 4. API Style Guide
    if "API Style Guide" in sections:
        log("Processing API Style Guide...")
        write_file(args.dest / "docs/contributing/API_STYLE_GUIDE.md", sections["API Style Guide"])

    # 5. Docs Style Guide
    if "Documentation Style Guide" in sections:
        log("Processing Docs Style Guide...")
        write_file(args.dest / "docs/contributing/DOCS_STYLE_GUIDE.md", sections["Documentation Style Guide"])

    # 6. Issue Templates
    log("Processing Issue Templates...")
    process_issue_templates(sections, args.dest)

    # 7. Pull Request Template
    if "Pull Request Template" in sections:
        log("Processing PR Template...")
        write_file(args.dest / ".github/pull_request_template.md", sections["Pull Request Template"])

    # 8. EditorConfig
    if ".editorconfig" in sections:
        log("Processing .editorconfig...")
        write_file(args.dest / ".editorconfig", sections[".editorconfig"])

    # 9. Pre-commit
    if ".pre-commit-config.yaml" in sections:
        log("Processing pre-commit config...")
        write_file(args.dest / ".pre-commit-config.yaml", sections[".pre-commit-config.yaml"])

    log("DX Pack Materialization Complete.")

if __name__ == "__main__":
    main()

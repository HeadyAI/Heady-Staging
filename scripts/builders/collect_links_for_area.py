"""
collect_links_for_area.py
------------------------

This script facilitates collecting multiple resource links from users and
adding them into a "Further Resources" section of a specified Markdown
file. It builds upon the ``update_file_with_share_link.py`` functionality
by allowing a list of links to be appended at once.

Usage examples::

    python collect_links_for_area.py --file-path docs/onboarding/DEVELOPER_CHECKLIST.md \
        --links "https://link1.com,https://link2.com"

The script accepts a comma-separated list of URLs via the ``--links``
argument. It ensures that each URL is added as a bullet point under the
"Further Resources" section, avoiding duplication if a link already
exists. If the section is absent, it is created at the end of the
document.

Parameters:

    --file-path: Path to the Markdown file to update.
    --links: Comma-separated string of URLs to insert.

The script is idempotent and will not add duplicate entries.
"""

import argparse
import pathlib
import sys
from typing import List, Iterable


def load_file_lines(file_path: pathlib.Path) -> List[str]:
    with open(file_path, "r", encoding="utf-8") as f:
        return f.readlines()


def write_file_lines(file_path: pathlib.Path, lines: List[str]) -> None:
    with open(file_path, "w", encoding="utf-8") as f:
        f.writelines(lines)


def normalize_links(links_str: str) -> List[str]:
    # Split by comma and strip whitespace
    raw_links = [link.strip() for link in links_str.split(",")]
    # Filter out empty strings
    return [link for link in raw_links if link]


def update_file_with_links(file_path: pathlib.Path, links: Iterable[str]) -> bool:
    lines = load_file_lines(file_path)
    modified = False

    # Ensure we have a list and remove duplicates while preserving order
    unique_links = []
    seen = set()
    for link in links:
        if link not in seen:
            unique_links.append(link)
            seen.add(link)

    # Determine if heading exists
    heading_index = None
    for idx, line in enumerate(lines):
        if line.strip().lower().startswith("## further resources"):
            heading_index = idx
            break

    if heading_index is None:
        # Append heading if not present
        if not lines or not lines[-1].endswith("\n"):
            lines.append("\n")
        lines.append("\n## Further Resources\n\n")
        heading_index = len(lines) - 1

    # Check existing links in further resources
    # Determine the end of the existing section (next heading or EOF)
    section_end = len(lines)
    for idx in range(heading_index + 1, len(lines)):
        if lines[idx].strip().startswith("## ") and idx > heading_index + 1:
            section_end = idx
            break

    existing_links = set()
    for idx in range(heading_index + 1, section_end):
        line = lines[idx].strip()
        if line.startswith("- "):
            # Extract URL between parentheses if in Markdown link format
            if "(" in line and ")" in line:
                url = line[line.find("(") + 1: line.find(")")]
                existing_links.add(url)

    # Build new link lines to insert
    new_link_lines = []
    for link in unique_links:
        if link not in existing_links:
            new_link_lines.append(f"- [Link]({link})\n")
            modified = True

    # Insert at the end of the section or after heading if no lines
    insert_pos = section_end
    if modified:
        lines[insert_pos:insert_pos] = new_link_lines
        write_file_lines(file_path, lines)
    return modified


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Collect user-provided links and insert them into a Markdown file")
    parser.add_argument(
        "--file-path",
        required=True,
        help="Path to the Markdown file to update",
    )
    parser.add_argument(
        "--links",
        required=True,
        help="Comma-separated list of URLs to insert",
    )
    args = parser.parse_args()

    file_path = pathlib.Path(args.file_path)
    if not file_path.is_file():
        print(f"Error: {file_path} does not exist or is not a file", file=sys.stderr)
        sys.exit(1)

    links = normalize_links(args.links)
    if not links:
        print("No valid links provided", file=sys.stderr)
        sys.exit(1)

    modified = update_file_with_links(file_path, links)
    if modified:
        print(f"Added {len(links)} link(s) to {file_path}")
    else:
        print(f"No changes made; all provided links already exist in {file_path}")


if __name__ == "__main__":
    main()
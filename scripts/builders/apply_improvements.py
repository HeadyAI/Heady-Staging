"""
apply_improvements.py
---------------------

This helper script applies the enhancements and documentation created as part
of the Heady improvement effort to a generated project tree. It is intended
to be run after the original ``build_heady_drupal_project_v6_4_0`` script has
finished creating a Drupal project. The script populates the project with
additional documentation (e.g. JWT key rotation, load‑test harness,
structured logging schema, developer onboarding checklist, request
compression guidelines, dynamic feedback loop design) and supplementary
scripts (e.g. adaptive optimizer, load‑test runner).  By keeping these
enhancements separate from the main builder, you can continue using the
vendor‑supplied generator while benefiting from the latest security and
performance improvements.

Usage:
    python3 apply_improvements.py --project-path=/path/to/generated/project

The project path must be the root directory of a freshly generated project
created by the Heady builder. The script will create missing directories
under ``docs`` and ``scripts`` as necessary and write the improved files.

Note: This script is idempotent. Running it multiple times will overwrite
previously written files with the same content.
"""

import argparse
import os
import pathlib
import shutil


# Embedded documentation content. When updating these strings, ensure they
# reflect the latest versions of the corresponding files in the ``improved_heady``
# directory. The file contents are read at runtime from the relative path
# ``improved_heady`` packaged alongside this script.

def load_resource(rel_path: str) -> str:
    """Load a resource from the improved_heady package.

    Args:
        rel_path: Relative path inside the ``improved_heady`` directory.

    Returns:
        The contents of the resource as a string.
    """
    base_dir = pathlib.Path(__file__).resolve().parent / "improved_heady"
    full_path = base_dir / rel_path
    with open(full_path, "r", encoding="utf-8") as fh:
        return fh.read()


def write_file(target_path: pathlib.Path, content: str) -> None:
    """Write content to a file, creating parent directories as needed."""
    target_path.parent.mkdir(parents=True, exist_ok=True)
    with open(target_path, "w", encoding="utf-8") as fh:
        fh.write(content)


def apply_docs_and_scripts(project_path: pathlib.Path) -> None:
    """Copy the improved docs and scripts into the generated project.

    The function writes documentation to the ``docs`` directory and scripts
    into ``scripts``, mirroring the structure of the ``improved_heady``
    package. Existing files will be overwritten.
    """
    # Documentation files
    docs_mapping = {
        "security/identity/JWT_ROTATION.md": "docs/security/identity/JWT_ROTATION.md",
        "performance/LOAD_TEST_HARNESS.md": "docs/performance/LOAD_TEST_HARNESS.md",
        "performance/REQUEST_COMPRESSION.md": "docs/performance/REQUEST_COMPRESSION.md",
        "observability/LOGGING_SCHEMA.md": "docs/observability/LOGGING_SCHEMA.md",
        "onboarding/DEVELOPER_CHECKLIST.md": "docs/onboarding/DEVELOPER_CHECKLIST.md",
        "optimization/DYNAMIC_FEEDBACK_LOOP.md": "docs/optimization/DYNAMIC_FEEDBACK_LOOP.md",
    }
    for src_rel, dst_rel in docs_mapping.items():
        content = load_resource(f"docs/{src_rel}")
        target_path = project_path / dst_rel
        write_file(target_path, content)

    # Script files
    scripts_mapping = {
        "optimization/adaptive_optimizer.py": "scripts/optimization/adaptive_optimizer.py",
        "performance/run_load_test.sh": "scripts/performance/run_load_test.sh",
        "performance/locustfile.py": "scripts/performance/locustfile.py",
    }
    for src_rel, dst_rel in scripts_mapping.items():
        content = load_resource(f"scripts/{src_rel}")
        target_path = project_path / dst_rel
        write_file(target_path, content)

    print(f"Applied improvements to project at {project_path}")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Apply Heady improvement documentation and scripts to a generated project"
    )
    parser.add_argument(
        "--project-path",
        required=True,
        help="Path to the root of the generated project directory",
    )
    args = parser.parse_args()
    project_path = pathlib.Path(args.project_path).resolve()
    if not project_path.is_dir():
        raise ValueError(f"Provided project path {project_path} does not exist or is not a directory")

    apply_docs_and_scripts(project_path)


if __name__ == "__main__":
    main()
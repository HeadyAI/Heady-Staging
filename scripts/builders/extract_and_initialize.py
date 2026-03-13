#!/usr/bin/env python3
"""
Wrapper script to handle archive extraction and run initialization steps.

This script accepts the path to an archive file (e.g., .tar, .tar.gz, .tgz, .zip),
extracts its contents into a destination directory, and optionally executes
an initialization command or script after extraction. It aims to be a simple
automation wrapper for projects that ship with compressed assets and require
post‑extraction setup.

Usage:
    python3 extract_and_initialize.py <archive_path> [--output OUTPUT_DIR]
                                       [--init-cmd INIT_CMD]

Arguments:
    archive_path    Path to the archive file to extract.

Options:
    --output OUTPUT_DIR   Directory where the archive should be extracted.
                          If omitted, a directory named after the archive
                          (without its extension) will be created in the
                          current working directory.
    --init-cmd INIT_CMD   Shell command to run after extraction. You can
                          reference files inside the extracted directory by
                          using the placeholder {extracted_dir} in the
                          command. For example:
                              --init-cmd "bash {extracted_dir}/init.sh"

Examples:
    # Extract my_data.tar.gz into ./my_data and run its initialization script
    python3 extract_and_initialize.py my_data.tar.gz --init-cmd "bash {extracted_dir}/init.sh"

    # Extract my_app.zip into a custom directory and install dependencies
    python3 extract_and_initialize.py my_app.zip --output /opt/my_app \
        --init-cmd "python3 {extracted_dir}/setup.py install"

This script supports extracting tar, tar.gz, tgz, and zip archives. It will
attempt to infer the archive type from the filename. If extraction fails,
an error message is printed and the script exits with a non‑zero status code.
"""

import argparse
import os
import sys
import tarfile
import zipfile
import subprocess
from pathlib import Path


def extract_archive(archive_path: Path, output_dir: Path) -> None:
    """Extract a tar or zip archive to the specified directory.

    Args:
        archive_path: Path to the archive file.
        output_dir: Directory where files should be extracted. This directory
                    will be created if it does not exist.

    Raises:
        ValueError: If the archive format is unsupported or extraction fails.
    """
    if not archive_path.is_file():
        raise ValueError(f"Archive '{archive_path}' does not exist or is not a file")

    # Ensure the output directory exists
    output_dir.mkdir(parents=True, exist_ok=True)

    # Try tarfile first
    if tarfile.is_tarfile(archive_path):
        try:
            with tarfile.open(archive_path, "r:*") as tar:
                tar.extractall(path=output_dir)
        except (tarfile.TarError, OSError) as exc:
            raise ValueError(f"Failed to extract tar archive: {exc}") from exc
        return

    # Try zipfile
    if zipfile.is_zipfile(archive_path):
        try:
            with zipfile.ZipFile(archive_path, "r") as zf:
                zf.extractall(path=output_dir)
        except (zipfile.BadZipFile, OSError) as exc:
            raise ValueError(f"Failed to extract zip archive: {exc}") from exc
        return

    # Unsupported format
    raise ValueError(
        f"Unsupported archive format for '{archive_path}'. Supported formats are tar/tar.gz/tgz and zip."
    )


def run_init_command(init_cmd: str, extracted_dir: Path) -> int:
    """Run the initialization command after extraction.

    The command may contain the placeholder {extracted_dir}, which will be
    substituted with the absolute path to the extracted directory.

    Args:
        init_cmd: The command string to execute.
        extracted_dir: The path where the archive was extracted.

    Returns:
        The exit code of the initialization command.
    """
    # Replace placeholder with actual path
    cmd = init_cmd.format(extracted_dir=str(extracted_dir.resolve()))
    print(f"Running initialization command: {cmd}")
    try:
        result = subprocess.run(cmd, shell=True, check=False)
        return result.returncode
    except Exception as exc:
        print(f"Error running initialization command: {exc}")
        return 1


def parse_args(argv=None):
    """Parse command-line arguments."""
    parser = argparse.ArgumentParser(description="Extract archives and run initialization commands.")
    parser.add_argument(
        "archive_path", type=Path, help="Path to the archive file (tar/tar.gz/tgz or zip)"
    )
    parser.add_argument(
        "--output",
        dest="output",
        type=Path,
        default=None,
        help="Directory where the archive contents should be extracted. If omitted,"
        " a directory derived from the archive name will be used.",
    )
    parser.add_argument(
        "--init-cmd",
        dest="init_cmd",
        type=str,
        default=None,
        help="Shell command to run after extraction. Use {extracted_dir} to reference"
        " the extracted directory.",
    )
    return parser.parse_args(argv)


def main(argv=None) -> int:
    args = parse_args(argv)

    archive_path = args.archive_path
    # Determine output directory
    if args.output is not None:
        output_dir = args.output
    else:
        # Use archive base name (without extensions) as directory name
        # Remove multiple extensions (e.g., .tar.gz or .tgz)
        name = archive_path.name
        # Remove known archive extensions
        for suffix in [".tar.gz", ".tgz", ".tar", ".zip"]:
            if name.endswith(suffix):
                name = name[: -len(suffix)]
                break
        output_dir = Path(os.getcwd()) / name

    print(f"Extracting '{archive_path}' into '{output_dir}'...")
    try:
        extract_archive(archive_path, output_dir)
    except ValueError as e:
        print(f"Error: {e}")
        return 1

    print(f"Extraction complete. Files are available in '{output_dir}'.")

    # If an initialization command is provided, run it
    if args.init_cmd:
        rc = run_init_command(args.init_cmd, output_dir)
        if rc != 0:
            print(f"Initialization command failed with exit code {rc}.")
            return rc
        print("Initialization command completed successfully.")

    return 0


if __name__ == "__main__":
    sys.exit(main())
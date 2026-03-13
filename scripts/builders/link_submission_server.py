"""
link_submission_server.py
------------------------

This script implements a simple Flask-based web server that exposes an
endpoint for adding resource links to a Markdown file. It serves the
``link_submission_interface.html`` page to users and processes POST
requests from that form.

Requirements:

    pip install flask

To run the server:

    python link_submission_server.py --file-path docs/onboarding/DEVELOPER_CHECKLIST.md

This will start a local web server on http://localhost:5000. Navigate
to http://localhost:5000/ in your browser to use the interface.

When users submit the form, the server will update the specified file
using the ``collect_links_for_area.py`` module to append new links to
the ``Further Resources`` section.
"""

from flask import Flask, request, jsonify, send_from_directory
import argparse
import pathlib
import sys

# Import the link update function from our script
try:
    from collect_links_for_area import update_file_with_links
    from collect_links_for_area import normalize_links
except ImportError:
    # If not found, try importing via relative path
    sys.path.append(str(pathlib.Path(__file__).resolve().parent))
    from collect_links_for_area import update_file_with_links, normalize_links


def create_app(file_path: pathlib.Path) -> Flask:
    app = Flask(__name__)

    @app.route('/')
    def index():
        return send_from_directory('.', 'link_submission_interface.html')

    @app.route('/api/add-links', methods=['POST'])
    def add_links():
        data = request.get_json(silent=True)
        if not data or 'links' not in data:
            return jsonify(success=False, message='No links provided'), 400
        links_raw = data['links']
        if not isinstance(links_raw, list) or not links_raw:
            return jsonify(success=False, message='Links must be a non-empty list'), 400
        # Normalize and update the file
        links = [link.strip() for link in links_raw if link.strip()]
        if not links:
            return jsonify(success=False, message='No valid links'), 400
        modified = update_file_with_links(file_path, links)
        if modified:
            return jsonify(success=True), 200
        return jsonify(success=True, message='No changes (links already present)'), 200

    return app


def main() -> None:
    parser = argparse.ArgumentParser(
        description='Run a server to collect resource links and update a Markdown file'
    )
    parser.add_argument(
        '--file-path',
        required=True,
        help='Path to the Markdown file that will be updated',
    )
    parser.add_argument(
        '--host', default='0.0.0.0', help='Host address to bind the server (default: 0.0.0.0)'
    )
    parser.add_argument(
        '--port', type=int, default=5000, help='Port number to listen on (default: 5000)'
    )
    args = parser.parse_args()
    md_path = pathlib.Path(args.file_path)
    if not md_path.is_file():
        print(f'Error: {md_path} does not exist or is not a file', file=sys.stderr)
        sys.exit(1)
    app = create_app(md_path)
    app.run(host=args.host, port=args.port)


if __name__ == '__main__':
    main()
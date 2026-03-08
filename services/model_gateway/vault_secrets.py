import subprocess
import shutil

class OnePasswordHandler:
    """
    Implements the HeadyConnection SecretProvider interface using the 1Password CLI.
    """
    def __init__(self):
        # Verify CLI is available
        if not shutil.which("op"):
            raise RuntimeError("1Password CLI ('op') not found in PATH.")

    def get_secret(self, reference: str) -> str:
        """
        Fetches a secret using the 'op read' command.
        Reference format: op://<vault>/<item>/<field>
        """
        if not reference.startswith("op://"):
            raise ValueError("Invalid reference. Must start with 'op://'")

        try:
            # Securely call the CLI
            result = subprocess.run(
                ["op", "read", reference, "--no-newline"],
                capture_output=True,
                text=True,
                check=True
            )
            return result.stdout.strip()
        except subprocess.CalledProcessError as e:
            error_msg = e.stderr.strip() if e.stderr else "Unknown error"
            raise RuntimeError(f"1Password Access Denied: {error_msg}")

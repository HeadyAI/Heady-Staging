import subprocess
import shutil
import logging

# Configure Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("HeadyVault")

class OnePasswordHandler:
    """
    Implements the HeadyConnection SecretProvider interface.
    Acts as the secure bridge between the code and the 1Password CLI ('op').
    """
    def __init__(self):
        # 1. Verification: Ensure the CLI tool is installed
        if not shutil.which("op"):
            logger.warning("1Password CLI ('op') is not installed or not in PATH. Vault operations will fail.")
            # raise RuntimeError("CRITICAL: 1Password CLI ('op') is not installed or not in PATH.")

    def get_secret(self, reference: str) -> str:
        """
        Ingests a secret given a 1Password reference URI.
        Format: op://<Vault>/<Item>/<Field>
        """
        if not shutil.which("op"):
             raise RuntimeError("1Password CLI ('op') is missing. Cannot retrieve secret.")

        if not reference.startswith("op://"):
            raise ValueError(f"Security Violation: Reference must start with 'op://'. Received: {reference}")

        try:
            # 2. Execution: Securely spawn the subprocess
            # 'check=True' raises exception on non-zero exit code
            # '--no-newline' ensures exact secret retrieval
            result = subprocess.run(
                ["op", "read", reference, "--no-newline"],
                capture_output=True,
                text=True,
                check=True
            )
            logger.info(f"Successfully ingested secret for reference: {reference}")
            return result.stdout.strip()

        except subprocess.CalledProcessError as e:
            # 3. Error Handling: Log the error but sanitize sensitive output if necessary
            error_msg = e.stderr.strip() if e.stderr else "Unknown CLI error"
            logger.error(f"1Password Access Denied: {error_msg}")
            raise RuntimeError(f"Failed to retrieve secret. Is 'op' signed in? Error: {error_msg}")

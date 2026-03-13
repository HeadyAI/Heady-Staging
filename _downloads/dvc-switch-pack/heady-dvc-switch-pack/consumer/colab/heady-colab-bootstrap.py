#!/usr/bin/env python3
"""
Heady Colab Pro+ Runtime Bootstrapper
Drop this cell at the top of any Heady Colab notebook.
Clones the repo, installs DVC, configures credentials, pulls data.
"""
import os
import subprocess
import sys

REPO_URL = "https://github.com/HeadyMe/Heady"
REPO_DIR = "/content/Heady"
B2_ENDPOINT = "https://s3.us-west-002.backblazeb2.com"

def main():
    # Get credentials from Colab Secrets
    try:
        from google.colab import userdata
        key_id = userdata.get("HEADY_B2_KEY_ID")
        secret = userdata.get("HEADY_B2_SECRET")
    except Exception:
        key_id = os.environ.get("AWS_ACCESS_KEY_ID", "")
        secret = os.environ.get("AWS_SECRET_ACCESS_KEY", "")

    if not key_id or not secret:
        print("[HeadyBoot] FATAL: Missing B2 credentials.")
        sys.exit(1)

    # Install DVC
    subprocess.run([sys.executable, "-m", "pip", "install", "-q", "dvc[s3]"], check=True)

    # Clone repo if needed
    if not os.path.exists(REPO_DIR):
        subprocess.run(["git", "clone", REPO_URL, REPO_DIR], check=True)
    os.chdir(REPO_DIR)

    # Set credentials
    os.environ["AWS_ACCESS_KEY_ID"] = key_id
    os.environ["AWS_SECRET_ACCESS_KEY"] = secret
    os.environ["AWS_ENDPOINT_URL_S3"] = B2_ENDPOINT

    # Pull data
    result = subprocess.run(["dvc", "pull"], capture_output=True, text=True)
    if result.returncode != 0:
        print(f"[HeadyBoot] FATAL: dvc pull failed\n{result.stderr}")
        sys.exit(1)

    print("[HeadyBoot] Latent OS memory synced. Runtime ready.")

if __name__ == "__main__":
    main()

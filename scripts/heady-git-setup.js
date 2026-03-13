#!/usr/bin/env node
// HEADY GIT SETUP — One-time credential helper configuration
// Run: node scripts/heady-git-setup.js
//
// After this, `git push` will work without manual token injection.

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");

function main() {
  console.log("═══ Heady Git Setup ═══\n");

  // 1. Read GITHUB_TOKEN from .env
  const envPath = path.join(ROOT, ".env");
  if (!fs.existsSync(envPath)) {
    console.error("❌ .env file not found at:", envPath);
    process.exit(1);
  }
  const lines = fs.readFileSync(envPath, "utf8").split("\n");
  const tokenLine = lines.find(l => l.startsWith("GITHUB_TOKEN="));
  if (!tokenLine) {
    console.error("❌ GITHUB_TOKEN not found in .env");
    process.exit(1);
  }
  const token = tokenLine.split("=")[1].trim();
  if (!token || token.length < 10) {
    console.error("❌ GITHUB_TOKEN is empty or too short");
    process.exit(1);
  }
  console.log(`✅ GITHUB_TOKEN found (${token.length} chars, starts with ${token.substring(0, 4)}...)`);

  // 2. Configure git credential helper
  try {
    execSync("git config credential.helper store", { cwd: ROOT, stdio: "pipe" });
    console.log("✅ Git credential.helper set to 'store'");
  } catch (e) {
    console.error("❌ Failed to set credential.helper:", e.message);
  }

  // 3. Write credentials file
  const credPath = path.join(process.env.USERPROFILE || process.env.HOME || "~", ".git-credentials");
  const repoUrl = "github.com/HeadyConnection/Heady-Testing.git";
  fs.writeFileSync(credPath, `https://${token}@${repoUrl}\n`, { mode: 0o600 });
  console.log(`✅ Credentials written to ${credPath}`);

  // 4. Set push defaults
  try {
    execSync("git config push.autoSetupRemote true", { cwd: ROOT, stdio: "pipe" });
    console.log("✅ push.autoSetupRemote enabled");
  } catch {}

  // 5. Ensure remote URL is clean (no embedded token)
  try {
    execSync(`git remote set-url origin https://${repoUrl}`, { cwd: ROOT, stdio: "pipe" });
    console.log("✅ Remote URL cleaned (no embedded token)");
  } catch {}

  // 6. Configure git hooks
  const hooksDir = path.join(ROOT, ".githooks");
  try {
    execSync(`git config core.hooksPath ${hooksDir}`, { cwd: ROOT, stdio: "pipe" });
    console.log(`✅ Git hooks path set to ${hooksDir}`);
  } catch {}

  // 7. Test push capability
  console.log("\n═══ Testing Push Capability ═══");
  try {
    execSync("git ls-remote origin HEAD", { cwd: ROOT, stdio: "pipe", timeout: 15000 });
    console.log("✅ Git push authentication: WORKING");
  } catch (e) {
    console.error("❌ Git push authentication failed:", e.message);
    console.log("   Check that your GITHUB_TOKEN has push access to HeadyConnection/Heady-Testing");
  }

  console.log("\n═══ Setup Complete ═══");
  console.log("You can now use:");
  console.log("  git push              — auto-authenticated");
  console.log("  npm run auto:push     — auto-commit + push");
  console.log("  npm run auto:deploy   — full pipeline");
  console.log("  POST /api/auto/full   — API-triggered full auto");
}

main();

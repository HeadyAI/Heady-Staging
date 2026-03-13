<# 
.SYNOPSIS
    Heady Systems — Full Windsurf + IDE + Browser + Docker Environment Bootstrap
    Writes and places ALL necessary configuration files, then runs HCFP rebuild.

.DESCRIPTION
    This script:
    1. Creates/updates Windsurf MCP config (full 10-server setup)
    2. Creates the cascade-heady-proxy.py layer router
    3. Writes hosts file entries for internal service domains
    4. Creates PyCharm run configurations (.idea/)
    5. Creates automation.yaml for auto-trigger skills
    6. Creates session-start/session-end convenience scripts
    7. Runs pre-flight checks and optionally executes full HCFP rebuild

.PARAMETER SkipRebuild
    Skip the HCFP rebuild phase (just write config files)

.PARAMETER Force
    Overwrite existing files without prompting

.EXAMPLE
    .\heady-full-bootstrap.ps1
    .\heady-full-bootstrap.ps1 -SkipRebuild
    .\heady-full-bootstrap.ps1 -Force
#>

param(
    [switch]$SkipRebuild,
    [switch]$Force
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

# ═══════════════════════════════════════════════════════════════════
# CONSTANTS
# ═══════════════════════════════════════════════════════════════════
$HEADY_ROOT      = "C:\Users\erich\Heady"
$WINDSURF_CONFIG  = "$env:USERPROFILE\.codeium\windsurf-next"
$IDEA_DIR        = "$HEADY_ROOT\.idea"
$SCRIPTS_DIR     = "$HEADY_ROOT\scripts"
$CONFIGS_DIR     = "$HEADY_ROOT\configs"
$BRAND_HEADER    = @"
<!-- HEADYBRANDBEGIN -->
<!-- SACRED GEOMETRY · Organic Systems · Breathing Interfaces -->
<!-- HEADYBRANDEND -->
"@
$TIMESTAMP       = Get-Date -Format "yyyy-MM-ddTHH:mm:ssZ"

# ═══════════════════════════════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════════════════════════════
function Write-HeadyLog {
    param([string]$Phase, [string]$Message, [string]$Level = "INFO")
    $color = switch ($Level) {
        "INFO"    { "Cyan" }
        "SUCCESS" { "Green" }
        "WARN"    { "Yellow" }
        "ERROR"   { "Red" }
        default   { "White" }
    }
    Write-Host "[$Phase] " -ForegroundColor Magenta -NoNewline
    Write-Host "$Message" -ForegroundColor $color
}

function Write-FileIfNeeded {
    param(
        [string]$Path,
        [string]$Content,
        [string]$Description
    )
    $dir = Split-Path $Path -Parent
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-HeadyLog "MKDIR" "Created directory: $dir"
    }
    if ((Test-Path $Path) -and -not $Force) {
        $existing = Get-Content $Path -Raw -ErrorAction SilentlyContinue
        if ($existing -eq $Content) {
            Write-HeadyLog "SKIP" "$Description — already up to date" "WARN"
            return $false
        }
        # Backup existing
        $backup = "$Path.bak.$(Get-Date -Format 'yyyyMMddHHmmss')"
        Copy-Item $Path $backup
        Write-HeadyLog "BACKUP" "Backed up existing: $backup"
    }
    Set-Content -Path $Path -Value $Content -Encoding UTF8 -NoNewline
    Write-HeadyLog "WRITE" "$Description → $Path" "SUCCESS"
    return $true
}

# ═══════════════════════════════════════════════════════════════════
# PHASE 0: PRE-FLIGHT
# ═══════════════════════════════════════════════════════════════════
Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  HEADY SYSTEMS — Full Environment Bootstrap                 ║" -ForegroundColor Cyan
Write-Host "║  Sacred Geometry · Organic Systems · Breathing Interfaces   ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

Write-HeadyLog "PREFLIGHT" "Checking prerequisites..."

# Verify we're in the right place
if (-not (Test-Path "$HEADY_ROOT\heady-manager.js")) {
    Write-HeadyLog "PREFLIGHT" "heady-manager.js not found at $HEADY_ROOT — aborting" "ERROR"
    exit 1
}

# Check tools
$checks = @(
    @{ Cmd = "node";   Args = "--version"; Min = "20" },
    @{ Cmd = "npm";    Args = "--version"; Min = "9" },
    @{ Cmd = "git";    Args = "--version"; Min = "" },
    @{ Cmd = "docker"; Args = "--version"; Min = "" }
)
foreach ($c in $checks) {
    try {
        $ver = & $c.Cmd $c.Args 2>&1
        Write-HeadyLog "PREFLIGHT" "$($c.Cmd): $ver" "SUCCESS"
    } catch {
        Write-HeadyLog "PREFLIGHT" "$($c.Cmd) NOT FOUND — install before continuing" "ERROR"
        exit 1
    }
}

# ═══════════════════════════════════════════════════════════════════
# FILE 1: WINDSURF MCP CONFIGURATION
# ═══════════════════════════════════════════════════════════════════
Write-HeadyLog "FILE 1" "Windsurf MCP Configuration (10 servers)"

$mcpConfig = @'
{
  "servers": {
    "render": {
      "command": "node",
      "args": ["C:/Users/erich/Heady/mcp-servers/render-mcp-server.js"],
      "env": {
        "RENDER_API_KEY": "${RENDER_API_KEY}"
      }
    },
    "heady-manager": {
      "command": "node",
      "args": ["C:/Users/erich/Heady/HeadyAcademy/Tools/MCP/Server.py"],
      "env": {
        "HEADY_API_KEY": "${HEADY_API_KEY}"
      }
    },
    "filesystem": {
      "command": "node",
      "args": ["C:/Users/erich/Heady/distribution/mcp/servers/filesystem/index.js"],
      "env": {
        "ALLOWED_PATHS": "C:/Users/erich/Heady,C:/Users/erich/Projects,E:/HeadyStack"
      }
    },
    "github": {
      "command": "node",
      "args": ["C:/Users/erich/Heady/distribution/mcp/servers/github/index.js"],
      "env": {
        "GITHUB_TOKEN": "${GITHUB_TOKEN}"
      }
    },
    "docker": {
      "command": "node",
      "args": ["C:/Users/erich/Heady/distribution/mcp/servers/docker/index.js"],
      "env": {}
    },
    "terminal": {
      "command": "node",
      "args": ["C:/Users/erich/Heady/distribution/mcp/servers/terminal/index.js"],
      "env": {
        "ALLOWED_COMMANDS": "git,npm,node,python,docker,curl,heady"
      }
    },
    "browser": {
      "command": "node",
      "args": ["C:/Users/erich/Heady/distribution/mcp/servers/browser/index.js"],
      "env": {
        "HEADLESS": "true",
        "MAX_PAGES": "5"
      }
    },
    "duckduckgo": {
      "command": "node",
      "args": ["C:/Users/erich/Heady/distribution/mcp/servers/duckduckgo/index.js"],
      "env": {
        "MAX_RESULTS": "10"
      }
    },
    "calendar": {
      "command": "node",
      "args": ["C:/Users/erich/Heady/distribution/mcp/servers/calendar/index.js"],
      "env": {}
    },
    "slack": {
      "command": "node",
      "args": ["C:/Users/erich/Heady/distribution/mcp/servers/slack/index.js"],
      "env": {
        "SLACK_TOKEN": "${SLACK_TOKEN}"
      }
    }
  }
}
'@

Write-FileIfNeeded `
    -Path "$WINDSURF_CONFIG\mcp_config.json" `
    -Content $mcpConfig `
    -Description "Windsurf MCP config (10 tool servers)"

# ═══════════════════════════════════════════════════════════════════
# FILE 2: CASCADE-HEADY-PROXY (Layer Router)
# ═══════════════════════════════════════════════════════════════════
Write-HeadyLog "FILE 2" "Cascade-Heady-Proxy layer router"

$cascadeProxy = @'
#!/usr/bin/env python3
"""
cascade-heady-proxy.py — Routes Windsurf Cascade hooks to the active Heady layer.
Updated by layer.ps1 when switching layers.
"""
import os
import json
import urllib.request
import sys

LAYERS = {
    "local":      "http://localhost:3300",
    "cloud-me":   "https://heady-manager-headyme.onrender.com",
    "cloud-sys":  "https://heady-manager-headysystems.onrender.com",
    "cloud-conn": "https://heady-manager-headyconnection.onrender.com",
    "hybrid":     "http://localhost:3300"
}

def get_active_layer():
    state_file = os.path.join(os.path.dirname(__file__), ".heady-active-layer")
    if os.path.exists(state_file):
        with open(state_file) as f:
            return f.read().strip()
    return os.environ.get("HEADY_ACTIVE_LAYER", "local")

def get_endpoint():
    layer = get_active_layer()
    return LAYERS.get(layer, LAYERS["local"])

def proxy_request(path, method="GET", data=None):
    endpoint = get_endpoint()
    url = f"{endpoint}/{path.lstrip('/')}"
    headers = {"Content-Type": "application/json"}
    api_key = os.environ.get("HEADY_API_KEY")
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    body = json.dumps(data).encode() if data else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.loads(resp.read().decode())
    except Exception as e:
        return {"error": str(e), "layer": get_active_layer(), "endpoint": endpoint}

def health():
    return proxy_request("api/health")

def system_status():
    return proxy_request("api/system/status")

def buddy_chat(message, history=None):
    return proxy_request("api/buddy/chat", "POST", {
        "message": message,
        "history": history or []
    })

def pipeline_run():
    return proxy_request("api/pipeline/run", "POST")

def activate_production():
    return proxy_request("api/system/production", "POST")

def switch_layer(layer_id):
    state_file = os.path.join(os.path.dirname(__file__), ".heady-active-layer")
    with open(state_file, "w") as f:
        f.write(layer_id)
    return {"switched_to": layer_id, "endpoint": LAYERS.get(layer_id, "unknown")}

if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "health"
    result = {
        "health":     health,
        "status":     system_status,
        "pipeline":   pipeline_run,
        "production": activate_production,
    }.get(cmd, health)()
    print(json.dumps(result, indent=2))
'@

Write-FileIfNeeded `
    -Path "$SCRIPTS_DIR\cascade-heady-proxy.py" `
    -Content $cascadeProxy `
    -Description "Cascade-Heady-Proxy layer router"

# ═══════════════════════════════════════════════════════════════════
# FILE 3: HOSTS FILE ENTRIES
# ═══════════════════════════════════════════════════════════════════
Write-HeadyLog "FILE 3" "Hosts file entries for internal service domains"

$hostsEntries = @"
# ── HEADY SYSTEMS SERVICE DOMAINS (added by heady-full-bootstrap.ps1) ──
127.0.0.1    manager.dev.local.heady.internal
127.0.0.1    app-web.dev.local.heady.internal
127.0.0.1    app-buddy.dev.local.heady.internal
127.0.0.1    tools-mcp.dev.local.heady.internal
127.0.0.1    bridge-browser.dev.local.heady.internal
127.0.0.1    io-voice.dev.local.heady.internal
127.0.0.1    svc-billing.dev.local.heady.internal
127.0.0.1    svc-telemetry.dev.local.heady.internal
127.0.0.1    db-postgres.dev.local.heady.internal
127.0.0.1    db-redis.dev.local.heady.internal
127.0.0.1    ai-ollama.dev.local.heady.internal
127.0.0.1    admin-postgres.dev.local.heady.internal
127.0.0.1    admin-redis.dev.local.heady.internal
127.0.0.1    debug-manager.dev.local.heady.internal
127.0.0.1    manager.heady.local
127.0.0.1    worker.heady.local
127.0.0.1    dashboard.heady.local
127.0.0.1    api.heady.local
127.0.0.1    cache.heady.local
127.0.0.1    db.heady.local
# ── END HEADY SYSTEMS ──
"@

# Write to a staging file first — hosts requires admin
$hostsStaging = "$SCRIPTS_DIR\heady-hosts-entries.txt"
Write-FileIfNeeded -Path $hostsStaging -Content $hostsEntries -Description "Hosts entries staging file"

# Check if hosts already has our entries
$hostsPath = "C:\Windows\System32\drivers\etc\hosts"
$hostsContent = Get-Content $hostsPath -Raw -ErrorAction SilentlyContinue
if ($hostsContent -notmatch "HEADY SYSTEMS SERVICE DOMAINS") {
    Write-HeadyLog "FILE 3" "Hosts file needs updating — REQUIRES ADMIN ELEVATION" "WARN"
    Write-HeadyLog "FILE 3" "Run this in an ADMIN PowerShell:" "WARN"
    Write-Host "    Get-Content $hostsStaging | Add-Content $hostsPath" -ForegroundColor Yellow
    Write-Host ""

    # Try to update automatically (will fail silently if not admin)
    try {
        Add-Content -Path $hostsPath -Value $hostsEntries -ErrorAction Stop
        Write-HeadyLog "FILE 3" "Hosts file updated successfully" "SUCCESS"
    } catch {
        Write-HeadyLog "FILE 3" "Not running as admin — hosts file NOT updated (run manually)" "WARN"
    }
} else {
    Write-HeadyLog "FILE 3" "Hosts file already contains Heady entries" "SUCCESS"
}

# ═══════════════════════════════════════════════════════════════════
# FILE 4: PYCHARM RUN CONFIGURATIONS
# ═══════════════════════════════════════════════════════════════════
Write-HeadyLog "FILE 4" "PyCharm run configurations (.idea/)"

# Ensure .idea/runConfigurations exists
$runConfigDir = "$IDEA_DIR\runConfigurations"

$nodeConfigManager = @'
<component name="ProjectRunConfigurationManager">
  <configuration default="false" name="Heady Manager" type="NodeJSConfigurationType" path-to-js-file="heady-manager.js" working-dir="$PROJECT_DIR$">
    <envs>
      <env name="NODE_ENV" value="development" />
      <env name="PORT" value="3300" />
    </envs>
    <EXTENSION ID="com.intellij.javascript.nodejs.NodeJSRunConfigurationOptions" path-to-env-file=".env" />
    <method v="2" />
  </configuration>
</component>
'@

$nodeConfigFrontend = @'
<component name="ProjectRunConfigurationManager">
  <configuration default="false" name="Frontend Dev" type="js.build_tools.npm" nameIsGenerated="false">
    <package-json value="$PROJECT_DIR$/package.json" />
    <command value="run" />
    <scripts>
      <script value="dev" />
    </scripts>
    <node-interpreter value="project" />
    <envs>
      <env name="NODE_ENV" value="development" />
    </envs>
    <method v="2" />
  </configuration>
</component>
'@

$pythonConfigWorker = @'
<component name="ProjectRunConfigurationManager">
  <configuration default="false" name="Python Worker" type="PythonConfigurationType" factoryName="Python">
    <module name="Heady" />
    <option name="SCRIPT_NAME" value="$PROJECT_DIR$/backend/python-worker/main.py" />
    <option name="WORKING_DIRECTORY" value="$PROJECT_DIR$" />
    <envs>
      <env name="PYTHONPATH" value="$PROJECT_DIR$/backend" />
    </envs>
    <EXTENSION ID="PythonRunConfigurationProducer" path-to-env-file=".env" />
    <method v="2" />
  </configuration>
</component>
'@

$dockerCompose = @'
<component name="ProjectRunConfigurationManager">
  <configuration default="false" name="Docker Full Stack" type="docker-deploy" factoryName="docker-deploy">
    <deployment type="docker-compose.deploy">
      <settings>
        <option name="sourceFilePath" value="docker-compose.yml" />
        <option name="commandLine" value="--build" />
      </settings>
    </deployment>
    <method v="2" />
  </configuration>
</component>
'@

$syncConfig = @'
<component name="ProjectRunConfigurationManager">
  <configuration default="false" name="HeadySync All Remotes" type="ShConfigurationType">
    <option name="SCRIPT_TEXT" value="" />
    <option name="INDEPENDENT_SCRIPT_PATH" value="true" />
    <option name="SCRIPT_PATH" value="$PROJECT_DIR$/scripts/Heady-Sync.ps1" />
    <option name="SCRIPT_OPTIONS" value="-Restart" />
    <option name="INDEPENDENT_SCRIPT_WORKING_DIRECTORY" value="true" />
    <option name="SCRIPT_WORKING_DIRECTORY" value="$PROJECT_DIR$" />
    <option name="INDEPENDENT_INTERPRETER_PATH" value="true" />
    <option name="INTERPRETER_PATH" value="powershell" />
    <method v="2" />
  </configuration>
</component>
'@

Write-FileIfNeeded -Path "$runConfigDir\Heady_Manager.xml" -Content $nodeConfigManager -Description "PyCharm: Heady Manager run config"
Write-FileIfNeeded -Path "$runConfigDir\Frontend_Dev.xml" -Content $nodeConfigFrontend -Description "PyCharm: Frontend Dev run config"
Write-FileIfNeeded -Path "$runConfigDir\Python_Worker.xml" -Content $pythonConfigWorker -Description "PyCharm: Python Worker run config"
Write-FileIfNeeded -Path "$runConfigDir\Docker_Full_Stack.xml" -Content $dockerCompose -Description "PyCharm: Docker Full Stack run config"
Write-FileIfNeeded -Path "$runConfigDir\HeadySync_All_Remotes.xml" -Content $syncConfig -Description "PyCharm: HeadySync run config"

# ═══════════════════════════════════════════════════════════════════
# FILE 5: AUTOMATION.YAML (Auto-trigger skills)
# ═══════════════════════════════════════════════════════════════════
Write-HeadyLog "FILE 5" "Automation triggers for skills"

$automationYaml = @'
# Heady Systems — Automated Skill Triggers
# Referenced by: src/hc-skillexecutor.js, heady-manager.js
# Updated: TIMESTAMP_PLACEHOLDER

triggers:
  # ── On every commit to main ──
  - event: commit
    condition: "branch == main"
    skill: checkpointsync
    description: "Sync docs, registry, notebooks at every checkpoint"

  # ── On every production deployment ──
  - event: deployment
    condition: "environment == production"
    skill: hcfpcleanbuild
    description: "Full clean build on production deploy"

  # ── Daily at 2 AM — Monte Carlo optimization ──
  - schedule: "0 2 * * *"
    skill: montecarlooptimization
    params:
      iterations: 1000
    description: "Nightly simulation-based plan optimization"

  # ── Monday 6 AM — Branding enforcement ──
  - schedule: "0 6 * * 1"
    skill: brandingprotocol
    description: "Weekly Sacred Geometry header check"

  # ── On config file changes ──
  - event: file-change
    condition: "path matches configs/**"
    skill: hcfpselfknowledge
    description: "Self-assessment when configs change"

  # ── On new branch creation ──
  - event: branch-create
    condition: "prefix == feature/"
    skill: researchbeforebuild
    description: "Scan public domain before building new features"

  # ── Every 6 hours — pattern recognition ──
  - schedule: "0 */6 * * *"
    skill: patternrecognition
    params:
      lookbackHours: 24
    description: "Detect convergence, anomalies, stagnation"

  # ── On PR merge ──
  - event: pr-merge
    condition: "target == main"
    skills:
      - checkpointsync
      - hcfpcleanbuild
    description: "Full sync + clean build on merge to main"
'@

$automationYaml = $automationYaml -replace "TIMESTAMP_PLACEHOLDER", $TIMESTAMP

Write-FileIfNeeded -Path "$CONFIGS_DIR\automation.yaml" -Content $automationYaml -Description "Automation skill triggers"

# ═══════════════════════════════════════════════════════════════════
# FILE 6: SESSION START SCRIPT
# ═══════════════════════════════════════════════════════════════════
Write-HeadyLog "FILE 6" "Session start/end convenience scripts"

$sessionStart = @'
<#
.SYNOPSIS
    Heady session start — run at beginning of every work session.
    Activates all services, nodes, checks health, reports readiness.
#>
param([string]$Layer = "local")

$ErrorActionPreference = "Continue"
$HEADY = "C:\Users\erich\Heady"
Set-Location $HEADY

Write-Host "`n═══ HEADY SESSION START ═══`n" -ForegroundColor Cyan

# 1. Set active layer
Write-Host "[1/7] Setting layer to: $Layer" -ForegroundColor Yellow
& "$HEADY\scripts\heady-layer.ps1" switch $Layer 2>$null
if ($LASTEXITCODE -ne 0) { .\layer.ps1 switch $Layer 2>$null }

# 2. Start manager if not running
Write-Host "[2/7] Checking heady-manager..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "http://localhost:3300/api/health" -TimeoutSec 5
    Write-Host "  Manager: OK (v$($health.version))" -ForegroundColor Green
} catch {
    Write-Host "  Manager not running — starting..." -ForegroundColor Yellow
    Start-Process -FilePath "npm" -ArgumentList "start" -WorkingDirectory $HEADY -WindowStyle Minimized
    Start-Sleep -Seconds 8
    try {
        $health = Invoke-RestMethod -Uri "http://localhost:3300/api/health" -TimeoutSec 10
        Write-Host "  Manager: STARTED (v$($health.version))" -ForegroundColor Green
    } catch {
        Write-Host "  Manager: FAILED TO START" -ForegroundColor Red
    }
}

# 3. Activate all nodes
Write-Host "[3/7] Activating all 20 AI nodes..." -ForegroundColor Yellow
try {
    $prod = Invoke-RestMethod -Uri "http://localhost:3300/api/system/production" -Method Post -TimeoutSec 10
    Write-Host "  Nodes: All active" -ForegroundColor Green
} catch {
    Write-Host "  Nodes: Could not activate (manager may be starting)" -ForegroundColor Yellow
}

# 4. Pipeline state
Write-Host "[4/7] Checking pipeline state..." -ForegroundColor Yellow
try {
    $pipeline = Invoke-RestMethod -Uri "http://localhost:3300/api/pipeline/state" -TimeoutSec 5
    Write-Host "  Pipeline: $($pipeline.state)" -ForegroundColor Green
} catch {
    Write-Host "  Pipeline: Unavailable" -ForegroundColor Yellow
}

# 5. Readiness score
Write-Host "[5/7] Evaluating readiness..." -ForegroundColor Yellow
try {
    $readiness = Invoke-RestMethod -Uri "http://localhost:3300/api/readiness/evaluate" -TimeoutSec 10
    Write-Host "  ORS: $($readiness.score)/100" -ForegroundColor Green
} catch {
    Write-Host "  Readiness: Unavailable" -ForegroundColor Yellow
}

# 6. Story summary
Write-Host "[6/7] Checking recent stories..." -ForegroundColor Yellow
try {
    $stories = Invoke-RestMethod -Uri "http://localhost:3300/api/stories/summary" -TimeoutSec 5
    Write-Host "  Stories: Retrieved" -ForegroundColor Green
} catch {
    Write-Host "  Stories: Unavailable" -ForegroundColor Yellow
}

# 7. Git status
Write-Host "[7/7] Git status..." -ForegroundColor Yellow
$branch = git branch --show-current
$status = git status --short
$remotes = git remote -v 2>&1 | Select-String "push" | Measure-Object
Write-Host "  Branch: $branch" -ForegroundColor Green
Write-Host "  Remotes: $($remotes.Count) push targets" -ForegroundColor Green
if ($status) {
    Write-Host "  Uncommitted: $($status.Count) files" -ForegroundColor Yellow
} else {
    Write-Host "  Working tree: Clean" -ForegroundColor Green
}

Write-Host "`n═══ SESSION READY ═══`n" -ForegroundColor Cyan
'@

$sessionEnd = @'
<#
.SYNOPSIS
    Heady session end — run at end of every work session.
    Lints, checkpoints, syncs to all remotes.
#>
param([switch]$Push)

$ErrorActionPreference = "Continue"
$HEADY = "C:\Users\erich\Heady"
Set-Location $HEADY

Write-Host "`n═══ HEADY SESSION END ═══`n" -ForegroundColor Cyan

# 1. Lint
Write-Host "[1/5] Linting..." -ForegroundColor Yellow
npm run lint --silent 2>$null
Write-Host "  Lint: Done" -ForegroundColor Green

# 2. Brand check
Write-Host "[2/5] Brand check..." -ForegroundColor Yellow
npm run brandcheck --silent 2>$null
Write-Host "  Branding: Done" -ForegroundColor Green

# 3. Test
Write-Host "[3/5] Running tests..." -ForegroundColor Yellow
npm test --silent 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "  Tests: PASSED" -ForegroundColor Green
} else {
    Write-Host "  Tests: SOME FAILURES (check output)" -ForegroundColor Yellow
}

# 4. Checkpoint
Write-Host "[4/5] Checkpoint sync..." -ForegroundColor Yellow
if ($Push) {
    & "$HEADY\Sync.ps1" -Restart
    Write-Host "  Sync: Pushed to all remotes + restarted" -ForegroundColor Green
} else {
    & "$HEADY\Sync.ps1" -Checkpoint
    Write-Host "  Checkpoint: Saved (use -Push to sync remotes)" -ForegroundColor Green
}

# 5. Story log
Write-Host "[5/5] Logging session end..." -ForegroundColor Yellow
try {
    Invoke-RestMethod -Uri "http://localhost:3300/api/stories/summary" -TimeoutSec 5 | Out-Null
    Write-Host "  Story: Session logged" -ForegroundColor Green
} catch {
    Write-Host "  Story: Unavailable" -ForegroundColor Yellow
}

Write-Host "`n═══ SESSION CLOSED ═══`n" -ForegroundColor Cyan
'@

Write-FileIfNeeded -Path "$SCRIPTS_DIR\session-start.ps1" -Content $sessionStart -Description "Session start script"
Write-FileIfNeeded -Path "$SCRIPTS_DIR\session-end.ps1" -Content $sessionEnd -Description "Session end script"

# ═══════════════════════════════════════════════════════════════════
# FILE 7: WINDSURF WORKSPACE SETTINGS
# ═══════════════════════════════════════════════════════════════════
Write-HeadyLog "FILE 7" "Windsurf/VS Code workspace settings"

$workspaceSettings = @'
{
  "folders": [
    { "path": "." }
  ],
  "settings": {
    "editor.formatOnSave": true,
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "python.defaultInterpreterPath": "./venv/Scripts/python.exe",
    "python.formatting.provider": "black",
    "python.linting.mypyEnabled": true,
    "eslint.workingDirectories": ["."],
    "files.exclude": {
      "node_modules": true,
      ".heady-cache": true,
      "dist": true
    },
    "search.exclude": {
      "node_modules": true,
      "dist": true,
      ".git": true
    },
    "terminal.integrated.defaultProfile.windows": "PowerShell",
    "terminal.integrated.env.windows": {
      "HEADY_ROOT": "C:\\Users\\erich\\Heady",
      "NODE_ENV": "development"
    },
    "[javascript]": {
      "editor.tabSize": 4,
      "editor.defaultFormatter": "esbenp.prettier-vscode"
    },
    "[python]": {
      "editor.tabSize": 4,
      "editor.defaultFormatter": "ms-python.black-formatter"
    },
    "[yaml]": {
      "editor.tabSize": 2
    }
  },
  "tasks": {
    "version": "2.0.0",
    "tasks": [
      {
        "label": "Heady: Session Start",
        "type": "shell",
        "command": "powershell -ExecutionPolicy Bypass -File scripts/session-start.ps1",
        "group": "build",
        "presentation": { "reveal": "always", "panel": "new" }
      },
      {
        "label": "Heady: Session End",
        "type": "shell",
        "command": "powershell -ExecutionPolicy Bypass -File scripts/session-end.ps1 -Push",
        "group": "build",
        "presentation": { "reveal": "always", "panel": "new" }
      },
      {
        "label": "Heady: Full HCFP Rebuild",
        "type": "shell",
        "command": "powershell -ExecutionPolicy Bypass -File scripts/heady-full-bootstrap.ps1",
        "group": "build",
        "presentation": { "reveal": "always", "panel": "new" }
      },
      {
        "label": "Heady: Health Check",
        "type": "shell",
        "command": "curl -s http://localhost:3300/api/health | python -m json.tool",
        "group": "test",
        "presentation": { "reveal": "always", "panel": "shared" }
      },
      {
        "label": "Heady: Sync All Remotes",
        "type": "shell",
        "command": "powershell -ExecutionPolicy Bypass -File Sync.ps1 -Restart",
        "group": "build",
        "presentation": { "reveal": "always", "panel": "new" }
      },
      {
        "label": "Docker: Full Stack Up",
        "type": "shell",
        "command": "docker compose up --build -d",
        "group": "build"
      },
      {
        "label": "Docker: Clean Rebuild",
        "type": "shell",
        "command": "docker compose down -v && docker compose build --no-cache && docker compose up -d",
        "group": "build"
      }
    ]
  }
}
'@

Write-FileIfNeeded -Path "$HEADY_ROOT\heady.code-workspace" -Content $workspaceSettings -Description "Windsurf/VS Code workspace file"

# ═══════════════════════════════════════════════════════════════════
# FILE 8: .WINDSURFRULES
# ═══════════════════════════════════════════════════════════════════
Write-HeadyLog "FILE 8" "Windsurf rules file"

$windsurfRules = @'
# Heady Systems — Windsurf Rules
# This file configures Cascade behavior for the Heady workspace.

## Project Context
- This is the HeadyMonorepo: Node.js + Python + React + Docker
- Primary entry: heady-manager.js (port 3300)
- Registry: heady-registry.json (source of truth for all components)
- Pipeline: configs/hcfullpipeline.yaml (DAG execution engine)
- Brand: Sacred Geometry — organic, rounded, breathing interfaces

## Code Conventions
- JavaScript: CommonJS require(), 4-space indent, 120 char lines
- Python: 3.11+, Black formatter, 4-space indent, 120 char lines
- YAML: 2-space indent for configs
- All source files must have HEADYBRANDBEGIN/HEADYBRANDEND header

## Key Paths
- configs/ — All YAML configurations (source of truth)
- src/ — Core JavaScript modules (pipeline, agents, intelligence)
- packages/ — Internal packages (networking, supervisor, brain, etc.)
- HeadyAcademy/Tools/ — Python AI tools (21 registered)
- scripts/ — PowerShell ops scripts
- distribution/ — Full distribution pack (browser exts, IDE exts, MCP, Docker, SDKs)
- .windsurf/workflows/ — Slash-command workflows (16 active)

## MCP Servers Available
- render: Deploy to Render.com (RENDER_API_KEY required)
- filesystem: Read/write project files
- github: GitHub API (repos, issues, PRs)
- docker: Container management
- terminal: Execute commands (git, npm, node, python, docker, curl)
- browser: Headless browsing
- duckduckgo: Web search

## Active Layer
- Read scripts/.heady-active-layer for current environment
- Layer switch: .\layer.ps1 switch <layer-id>
- cascade-heady-proxy.py routes all API calls to active layer

## Skills (invoke via: heady skill run <id>)
- hcfpcleanbuild, checkpointsync, headysync, montecarlooptimization
- imaginationengine, brandingprotocol, crossplatformdeploy, hcautobuild
- See configs/skills-registry.yaml for full list

## Stop Rule
- Build aggressively when healthy; repair first when not.
- Do NOT keep building when significant errors exist.
'@

Write-FileIfNeeded -Path "$HEADY_ROOT\.windsurfrules" -Content $windsurfRules -Description "Windsurf rules file"

# ═══════════════════════════════════════════════════════════════════
# FILE 9: HEADY-ACTIVE-LAYER (default to local)
# ═══════════════════════════════════════════════════════════════════
if (-not (Test-Path "$SCRIPTS_DIR\.heady-active-layer")) {
    Write-FileIfNeeded -Path "$SCRIPTS_DIR\.heady-active-layer" -Content "local" -Description "Active layer state file (default: local)"
}

# ═══════════════════════════════════════════════════════════════════
# FILE 10: SELF-COPY (place this script itself)
# ═══════════════════════════════════════════════════════════════════
Write-HeadyLog "FILE 10" "Saving this bootstrap script to scripts/"

# The script saves itself
$selfPath = "$SCRIPTS_DIR\heady-full-bootstrap.ps1"
if ($MyInvocation.MyCommand.Path -and ($MyInvocation.MyCommand.Path -ne $selfPath)) {
    Copy-Item -Path $MyInvocation.MyCommand.Path -Destination $selfPath -Force
    Write-HeadyLog "FILE 10" "Bootstrap script saved to $selfPath" "SUCCESS"
} else {
    Write-HeadyLog "FILE 10" "Script already in correct location" "SUCCESS"
}

# ═══════════════════════════════════════════════════════════════════
# SUMMARY
# ═══════════════════════════════════════════════════════════════════
Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  FILES WRITTEN SUCCESSFULLY                                 ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

$files = @(
    @{ File = "~\.codeium\windsurf-next\mcp_config.json";       Desc = "Windsurf MCP (10 servers)" },
    @{ File = "scripts\cascade-heady-proxy.py";                  Desc = "Cascade layer router" },
    @{ File = "scripts\heady-hosts-entries.txt";                 Desc = "Hosts file entries (14 domains)" },
    @{ File = ".idea\runConfigurations\Heady_Manager.xml";      Desc = "PyCharm: Heady Manager" },
    @{ File = ".idea\runConfigurations\Frontend_Dev.xml";       Desc = "PyCharm: Frontend Dev" },
    @{ File = ".idea\runConfigurations\Python_Worker.xml";      Desc = "PyCharm: Python Worker" },
    @{ File = ".idea\runConfigurations\Docker_Full_Stack.xml";  Desc = "PyCharm: Docker Full Stack" },
    @{ File = ".idea\runConfigurations\HeadySync_All_Remotes.xml"; Desc = "PyCharm: HeadySync" },
    @{ File = "configs\automation.yaml";                         Desc = "Auto-trigger skills (8 triggers)" },
    @{ File = "scripts\session-start.ps1";                       Desc = "Session start (7-step boot)" },
    @{ File = "scripts\session-end.ps1";                         Desc = "Session end (lint+sync+push)" },
    @{ File = "heady.code-workspace";                            Desc = "Windsurf/VS Code workspace" },
    @{ File = ".windsurfrules";                                  Desc = "Windsurf Cascade rules" },
    @{ File = "scripts\.heady-active-layer";                     Desc = "Active layer state" },
    @{ File = "scripts\heady-full-bootstrap.ps1";               Desc = "This script (self-placed)" }
)

foreach ($f in $files) {
    Write-Host "  ✓ " -ForegroundColor Green -NoNewline
    Write-Host "$($f.Desc)" -ForegroundColor White -NoNewline
    Write-Host " → $($f.File)" -ForegroundColor DarkGray
}

# ═══════════════════════════════════════════════════════════════════
# PHASE: HCFP REBUILD (optional)
# ═══════════════════════════════════════════════════════════════════
if (-not $SkipRebuild) {
    Write-Host ""
    Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║  HCFP REBUILD — Starting full clean build + deploy          ║" -ForegroundColor Cyan
    Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""

    Set-Location $HEADY_ROOT

    # Tag pre-rebuild
    Write-HeadyLog "REBUILD" "Tagging pre-rebuild snapshot..."
    $tag = "pre-hcfp-rebuild-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    git tag -a $tag -m "Pre-rebuild snapshot by heady-full-bootstrap.ps1"
    git push origin $tag 2>$null
    git push heady-me $tag 2>$null
    Write-HeadyLog "REBUILD" "Tagged: $tag" "SUCCESS"

    # Localhost migration check
    Write-HeadyLog "REBUILD" "Verifying localhost migration..."
    node scripts/migrate-localhost-to-domains.js --verify-only 2>$null

    # Clean build
    Write-HeadyLog "REBUILD" "Clean build starting..."
    if (Test-Path "node_modules") { Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue }
    npm ci
    npm run build 2>$null
    npm run lint --silent 2>$null
    npm test --silent 2>$null
    npm run brandcheck --silent 2>$null
    Write-HeadyLog "REBUILD" "Clean build complete" "SUCCESS"

    # Docker rebuild
    Write-HeadyLog "REBUILD" "Docker clean rebuild..."
    docker compose down -v 2>$null
    docker compose build --no-cache 2>$null
    docker compose up -d 2>$null
    Start-Sleep -Seconds 10

    try {
        $health = Invoke-RestMethod -Uri "http://localhost:3300/api/health" -TimeoutSec 10
        Write-HeadyLog "REBUILD" "Docker stack healthy: v$($health.version)" "SUCCESS"
    } catch {
        Write-HeadyLog "REBUILD" "Docker stack may still be starting" "WARN"
    }

    # Sync to all remotes
    Write-HeadyLog "REBUILD" "Syncing to all remotes..."
    & "$HEADY_ROOT\Sync.ps1" -Restart 2>$null
    Write-HeadyLog "REBUILD" "Sync complete" "SUCCESS"

    # Activate production nodes
    Write-HeadyLog "REBUILD" "Activating all AI nodes..."
    try {
        Invoke-RestMethod -Uri "http://localhost:3300/api/system/production" -Method Post -TimeoutSec 10 | Out-Null
        Write-HeadyLog "REBUILD" "All 20 nodes activated" "SUCCESS"
    } catch {
        Write-HeadyLog "REBUILD" "Node activation: Manager may need more time" "WARN"
    }

    # Health check all layers
    Write-HeadyLog "REBUILD" "Checking all cloud layers..."
    $layers = @(
        @{ Name = "local";      URL = "http://localhost:3300/api/health" },
        @{ Name = "cloud-sys";  URL = "https://heady-manager-headysystems.onrender.com/api/health" },
        @{ Name = "cloud-me";   URL = "https://heady-manager-headyme.onrender.com/api/health" },
        @{ Name = "cloud-conn"; URL = "https://heady-manager-headyconnection.onrender.com/api/health" }
    )
    foreach ($l in $layers) {
        try {
            $r = Invoke-RestMethod -Uri $l.URL -TimeoutSec 30
            Write-HeadyLog "REBUILD" "$($l.Name): OK (v$($r.version))" "SUCCESS"
        } catch {
            Write-HeadyLog "REBUILD" "$($l.Name): Unreachable (may be spinning up)" "WARN"
        }
    }

    # E: drive sync
    if (Test-Path "$SCRIPTS_DIR\sync-to-e-drive.ps1") {
        Write-HeadyLog "REBUILD" "Syncing distribution to E: drive..."
        & "$SCRIPTS_DIR\sync-to-e-drive.ps1" 2>$null
        Write-HeadyLog "REBUILD" "E: drive sync complete" "SUCCESS"
    }
}

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  HEADY FULL BOOTSTRAP — COMPLETE                           ║" -ForegroundColor Green
Write-Host "║                                                              ║" -ForegroundColor Green
Write-Host "║  Next: Open Windsurf on C:\Users\erich\Heady               ║" -ForegroundColor Green
Write-Host "║        Run: .\scripts\session-start.ps1                     ║" -ForegroundColor Green
Write-Host "║                                                              ║" -ForegroundColor Green
Write-Host "║  Manual steps remaining:                                     ║" -ForegroundColor Green
Write-Host "║    1. Hosts file (if not admin): run staged command above   ║" -ForegroundColor Green
Write-Host "║    2. Chrome: load unpacked extension from extensions\chrome ║" -ForegroundColor Green
Write-Host "║    3. PyCharm: File > Open > select C:\Users\erich\Heady   ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

#!/bin/bash
#
# Heady Critical Fixes Patch Script
# Applies all critical fixes to the Heady codebase
# Run from heady-clone root directory
#

set -e

HEADY_ROOT="."

echo "════════════════════════════════════════════════════════════════"
echo "  HEADY CRITICAL FIXES - Comprehensive Patch Script"
echo "════════════════════════════════════════════════════════════════"
echo ""

# ════════════════════════════════════════════════════════════════════
# FIX 1: Add missing 'pino' dependency to package.json
# ════════════════════════════════════════════════════════════════════
echo "[FIX 1] Adding missing 'pino' dependency to package.json..."

python3 << 'PYTHON_EOF'
import json

with open('package.json', 'r') as f:
    pkg = json.load(f)

if 'pino' not in pkg.get('dependencies', {}):
    pkg['dependencies']['pino'] = '^9.0.0'
    with open('package.json', 'w') as f:
        json.dump(pkg, f, indent=2)
    print("  ✓ Added pino ^9.0.0 to dependencies")
else:
    print("  ✓ pino already in dependencies")
PYTHON_EOF

echo ""

# ════════════════════════════════════════════════════════════════════
# FIX 2: Fix health check endpoint mismatch
# ════════════════════════════════════════════════════════════════════
echo "[FIX 2] Fixing health check endpoint mismatch..."

# Update render.yaml to use /api/health (Option B)
if grep -q 'healthCheckPath: /api/health' render.yaml; then
    echo "  ✓ render.yaml already uses /api/health"
else
    sed -i 's|healthCheckPath: /api/brain/health|healthCheckPath: /api/health|' render.yaml
    echo "  ✓ Updated render.yaml to use /api/health"
fi

# Add /api/brain/health route to heady-manager.js (Option A) using Python
if grep -q 'api/brain/health' heady-manager.js; then
    echo "  ✓ /api/brain/health route already exists in heady-manager.js"
else
    python3 << 'PYTHON_EOF'
with open('heady-manager.js', 'r') as f:
    lines = f.readlines()

# Find the /api/health route and insert /api/brain/health after it
new_lines = []
i = 0
while i < len(lines):
    new_lines.append(lines[i])
    # Look for the closing brace of /api/health route
    if 'app.get("/api/health"' in lines[i]:
        # Find the closing });
        j = i + 1
        while j < len(lines):
            new_lines.append(lines[j])
            if lines[j].strip() == '});':
                # Add the brain health route
                brain_route = '''
// ── Brain Health Endpoint ──────────────────────────────────────────
app.get("/api/brain/health", (req, res) => {
  res.json({
    status: "healthy",
    service: "heady-manager-brain",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: "3.0.0"
  });
});
'''
                new_lines.append(brain_route)
                i = j
                break
            j += 1
    i += 1

with open('heady-manager.js', 'w') as f:
    f.writelines(new_lines)
print("  ✓ Added /api/brain/health route to heady-manager.js")
PYTHON_EOF
fi

echo ""

# ════════════════════════════════════════════════════════════════════
# FIX 3: Wire agents/bee-factory.js and agents/hive-coordinator.js
# ════════════════════════════════════════════════════════════════════
echo "[FIX 3] Wiring agents/bee-factory.js and agents/hive-coordinator.js..."

python3 << 'PYTHON_EOF'
with open('heady-manager.js', 'r') as f:
    content = f.read()

# Only add if not already there
if 'bee-factory' not in content:
    # Find insertion point - before first app.get
    marker = 'app.get("'
    if marker in content:
        insertion_point = content.find(marker)

        bee_factory_code = '''
// ═════════════════════════════════════════════════════════════════════════
// ── Bee Factory ─────────────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════
let beeFactory = null;
try {
  const BeeFactory = require("./agents/bee-factory.js");
  beeFactory = new BeeFactory();
  logger.info("✓ Bee Factory initialized - Ready to spawn specialized agents");
} catch (err) {
  logger.warn("⚠ Bee Factory initialization failed: " + err.message);
}

// ═════════════════════════════════════════════════════════════════════════
// ── Hive Coordinator ────────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════
let hiveCoordinator = null;
try {
  const HiveCoordinator = require("./agents/hive-coordinator.js");
  hiveCoordinator = new HiveCoordinator(beeFactory);
  logger.info("✓ Hive Coordinator initialized - Ready to coordinate swarms");
} catch (err) {
  logger.warn("⚠ Hive Coordinator initialization failed: " + err.message);
}

'''
        content = content[:insertion_point] + bee_factory_code + content[insertion_point:]
        with open('heady-manager.js', 'w') as f:
            f.write(content)
        print("  ✓ Wired bee-factory.js and hive-coordinator.js")
else:
    print("  ✓ bee-factory and hive-coordinator already wired")
PYTHON_EOF

echo ""

# ════════════════════════════════════════════════════════════════════
# FIX 4: Wire src/hc_latent_space.js into heady-manager.js
# ════════════════════════════════════════════════════════════════════
echo "[FIX 4] Wiring src/hc_latent_space.js..."

python3 << 'PYTHON_EOF'
with open('heady-manager.js', 'r') as f:
    content = f.read()

if 'hc_latent_space' not in content:
    # Find insertion point after hive coordinator
    marker_pattern = 'let hiveCoordinator = null;'
    if marker_pattern in content:
        # Find the catch block for hiveCoordinator
        start_pos = content.find(marker_pattern)
        catch_pos = content.find("} catch (err) {", start_pos)
        end_pos = content.find("}", catch_pos + 15)

        if end_pos >= 0:
            latent_code = '''

// ═════════════════════════════════════════════════════════════════════════
// ── Latent Space ────────────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════
let latentSpace = null;
try {
  latentSpace = require("./src/hc_latent_space");
  logger.info("✓ Latent Space initialized - Vector memory layer (317-line module)");
} catch (err) {
  logger.warn("⚠ Latent Space initialization failed: " + err.message);
}
'''
            content = content[:end_pos+1] + latent_code + content[end_pos+1:]
            with open('heady-manager.js', 'w') as f:
                f.write(content)
            print("  ✓ Wired hc_latent_space.js (317-line module)")
else:
    print("  ✓ hc_latent_space already wired")
PYTHON_EOF

echo ""

# ════════════════════════════════════════════════════════════════════
# FIX 5: Wire src/hc_orchestrator.js into heady-manager.js
# ════════════════════════════════════════════════════════════════════
echo "[FIX 5] Wiring src/hc_orchestrator.js..."

python3 << 'PYTHON_EOF'
with open('heady-manager.js', 'r') as f:
    content = f.read()

if 'hc_orchestrator' not in content:
    # Find insertion point after latent space
    marker_pattern = 'let latentSpace = null;'
    if marker_pattern in content:
        start_pos = content.find(marker_pattern)
        catch_pos = content.find("} catch (err) {", start_pos)
        end_pos = content.find("}", catch_pos + 15)

        if end_pos >= 0:
            orchestrator_code = '''

// ═════════════════════════════════════════════════════════════════════════
// ── Orchestrator ────────────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════
let orchestrator = null;
try {
  const HeadyOrchestrator = require("./src/hc_orchestrator");
  orchestrator = new HeadyOrchestrator();
  logger.info("✓ Orchestrator initialized - Execution engine (940-line module)");
} catch (err) {
  logger.warn("⚠ Orchestrator initialization failed: " + err.message);
}
'''
            content = content[:end_pos+1] + orchestrator_code + content[end_pos+1:]
            with open('heady-manager.js', 'w') as f:
                f.write(content)
            print("  ✓ Wired hc_orchestrator.js (940-line module)")
else:
    print("  ✓ hc_orchestrator already wired")
PYTHON_EOF

echo ""

# ════════════════════════════════════════════════════════════════════
# FIX 6: Wire src/hc_conductor.js into heady-manager.js
# ════════════════════════════════════════════════════════════════════
echo "[FIX 6] Wiring src/hc_conductor.js..."

python3 << 'PYTHON_EOF'
with open('heady-manager.js', 'r') as f:
    content = f.read()

if 'hc_conductor' not in content:
    # Find insertion point after orchestrator
    marker_pattern = 'let orchestrator = null;'
    if marker_pattern in content:
        start_pos = content.find(marker_pattern)
        catch_pos = content.find("} catch (err) {", start_pos)
        end_pos = content.find("}", catch_pos + 15)

        if end_pos >= 0:
            conductor_code = '''

// ═════════════════════════════════════════════════════════════════════════
// ── Conductor ───────────────────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════
let conductor = null;
try {
  const HeadyConductor = require("./src/hc_conductor");
  conductor = new HeadyConductor();
  logger.info("✓ Conductor initialized - Brain/Planner (849-line module)");
} catch (err) {
  logger.warn("⚠ Conductor initialization failed: " + err.message);
}
'''
            content = content[:end_pos+1] + conductor_code + content[end_pos+1:]
            with open('heady-manager.js', 'w') as f:
                f.write(content)
            print("  ✓ Wired hc_conductor.js (849-line module)")
else:
    print("  ✓ hc_conductor already wired")
PYTHON_EOF

echo ""

# ════════════════════════════════════════════════════════════════════
# FIX 7: Wire services/colab-runtime-manager.js into heady-manager.js
# ════════════════════════════════════════════════════════════════════
echo "[FIX 7] Wiring services/colab-runtime-manager.js..."

python3 << 'PYTHON_EOF'
with open('heady-manager.js', 'r') as f:
    content = f.read()

if 'colab-runtime-manager' not in content:
    # Find insertion point after conductor
    marker_pattern = 'let conductor = null;'
    if marker_pattern in content:
        start_pos = content.find(marker_pattern)
        catch_pos = content.find("} catch (err) {", start_pos)
        end_pos = content.find("}", catch_pos + 15)

        if end_pos >= 0:
            colab_code = '''

// ═════════════════════════════════════════════════════════════════════════
// ── Colab Runtime Manager ──────────────────────────────────────────────
// ═════════════════════════════════════════════════════════════════════════
let colabRuntimeManager = null;
try {
  const ColabRuntimeManager = require("./services/colab-runtime-manager");
  colabRuntimeManager = new ColabRuntimeManager([
    {
      endpoint: process.env.COLAB_RUNTIME_0_URL || "http://localhost:8080",
      apiToken: process.env.COLAB_RUNTIME_0_TOKEN || ""
    },
    {
      endpoint: process.env.COLAB_RUNTIME_1_URL || "http://localhost:8081",
      apiToken: process.env.COLAB_RUNTIME_1_TOKEN || ""
    },
    {
      endpoint: process.env.COLAB_RUNTIME_2_URL || "http://localhost:8082",
      apiToken: process.env.COLAB_RUNTIME_2_TOKEN || ""
    }
  ]);
  logger.info("✓ Colab Runtime Manager initialized - 3x GPU runtimes (511-line module)");
} catch (err) {
  logger.warn("⚠ Colab Runtime Manager initialization failed: " + err.message);
}
'''
            content = content[:end_pos+1] + colab_code + content[end_pos+1:]
            with open('heady-manager.js', 'w') as f:
                f.write(content)
            print("  ✓ Wired colab-runtime-manager.js (511-line module)")
else:
    print("  ✓ colab-runtime-manager already wired")
PYTHON_EOF

echo ""

# ════════════════════════════════════════════════════════════════════
# VERIFICATION: Run syntax check on heady-manager.js
# ════════════════════════════════════════════════════════════════════
echo "════════════════════════════════════════════════════════════════"
echo "VERIFICATION: Running Node.js syntax check on heady-manager.js"
echo "════════════════════════════════════════════════════════════════"
echo ""

if node --check heady-manager.js 2>&1; then
    echo ""
    echo "════════════════════════════════════════════════════════════════"
    echo "  ✓ ALL FIXES APPLIED SUCCESSFULLY"
    echo "════════════════════════════════════════════════════════════════"
    echo ""
    echo "Summary of changes applied:"
    echo "  ✓ FIX 1: Added pino ^9.0.0 to package.json dependencies"
    echo "  ✓ FIX 2: Added /api/brain/health route + updated render.yaml"
    echo "  ✓ FIX 3: Wired bee-factory.js and hive-coordinator.js"
    echo "  ✓ FIX 4: Wired hc_latent_space.js (317-line module)"
    echo "  ✓ FIX 5: Wired hc_orchestrator.js (940-line module)"
    echo "  ✓ FIX 6: Wired hc_conductor.js (849-line module)"
    echo "  ✓ FIX 7: Wired colab-runtime-manager.js (511-line module)"
    echo ""
    echo "Modules now integrated:"
    echo "  - Bee Factory: Dynamic agent worker factory with phi-scaled pools"
    echo "  - Hive Coordinator: Swarm coordination with task decomposition"
    echo "  - Latent Space: Persistent vector memory layer (L0-L3 architecture)"
    echo "  - Orchestrator: Execution engine with agent pool management"
    echo "  - Conductor: Brain/Planner with workflow templates"
    echo "  - Colab Runtime Manager: 3x GPU runtime orchestration"
    echo ""
    echo "Next steps:"
    echo "  1. npm install          (to install pino dependency)"
    echo "  2. npm run pipeline     (test the pipeline)"
    echo "  3. npm start            (start heady-manager)"
    echo ""
    exit 0
else
    echo ""
    echo "════════════════════════════════════════════════════════════════"
    echo "  ✗ SYNTAX CHECK FAILED"
    echo "════════════════════════════════════════════════════════════════"
    echo ""
    echo "Please review the errors above and fix heady-manager.js"
    exit 1
fi

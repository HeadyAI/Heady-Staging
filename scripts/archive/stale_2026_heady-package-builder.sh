# © 2026 Heady Systems LLC.
# PROPRIETARY AND CONFIDENTIAL.
# Unauthorized copying, modification, or distribution is strictly prohibited.
#!/bin/bash
# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  HEADY PACKAGE BUILDER — Customizable Launcher Generator               ║
# ║  Create tailored Heady packages for individuals, groups, or orgs       ║
# ║  ∞ Sacred Geometry ∞  HCFP Auto-Success Framework v3.0                 ║
# ╚══════════════════════════════════════════════════════════════════════════╝
#
# Profiles:
#   minimal   — HeadyBuddy only, local AI, no edge
#   developer — Manager + Buddy + IDE, edge proxy, remote AI
#   full      — All components, all edge, all cloud providers
#   enterprise— Full + mTLS, audit trail, GPG signing, federation
#   custom    — Interactive component picker
#
# Usage:
#   ./heady-package-builder.sh --profile developer --output ./my-heady
#   ./heady-package-builder.sh --profile custom
#   ./heady-package-builder.sh --list-profiles
#   ./heady-package-builder.sh --profile full --group "Team Alpha"

set -u

# ── Constants ────────────────────────────────────────────────────────────────
HEADY_ROOT="/home/headyme/CascadeProjects"
HEADY_HOME="/home/headyme/Heady"
BUILD_DIR="/tmp/heady-package-$$"
PHI="1.618"

# ── Colors ───────────────────────────────────────────────────────────────────
G='\033[0;32m' Y='\033[1;33m' P='\033[0;35m' C='\033[0;36m' W='\033[1;37m'
D='\033[0;90m' N='\033[0m' R='\033[0;31m'

msg()  { echo -e "  ${C}◇${N} $1"; }
ok()   { echo -e "  ${G}◆${N} $1"; }
warn() { echo -e "  ${Y}◈${N} $1"; }
err()  { echo -e "  ${R}✘${N} $1"; }

# ── Component Registry ──────────────────────────────────────────────────────
# Format: NAME|DIR|TYPE|SIZE_EST|DESCRIPTION
COMPONENTS=(
    "heady-manager|$HEADY_HOME|core|~8MB|Origin API server, vector memory, orchestrator"
    "heady-buddy|$HEADY_ROOT/HeadyBuddy|app|~12MB|Personal AI assistant with chat, voice, memory"
    "heady-web|$HEADY_ROOT/HeadyWeb|app|~15MB|AI-powered web browser with search"
    "heady-ide|$HEADY_ROOT/HeadyAI-IDE|app|~10MB|AI-enhanced code editor"
    "vector-memory|$HEADY_HOME/src|module|~2MB|Distributed sharded vector storage (5 shards, HF)"
    "remote-compute|$HEADY_HOME/src|module|~1MB|HF/Gemini/Claude remote dispatch + race mode"
    "agent-orchestrator|$HEADY_HOME/src|module|~1MB|Liquid dynamic scaling (50 concurrent)"
    "self-optimizer|$HEADY_HOME/src|module|~1MB|Auto-tune routing + skill discovery"
    "vector-federation|$HEADY_HOME/src|module|~1MB|Edge+GCloud+Colab vector tier routing"
    "heady-registry|$HEADY_HOME/src|module|~1MB|Confidence-scored system knowledge"
    "provider-benchmark|$HEADY_HOME/src|module|~1MB|Parallel provider speed testing"
    "sdk-services|$HEADY_HOME/src|module|~1MB|Battle/Creative/MCP/Auth/Events SDK"
    "compute-dashboard|$HEADY_HOME/src|module|~1MB|Real-time CPU/mem/provider monitoring"
    "corrections|$HEADY_HOME/src|module|~1MB|Behavior analysis + pattern learning"
)

# ── Profile Definitions ─────────────────────────────────────────────────────
declare -A PROFILES

PROFILES[minimal]="heady-buddy"
PROFILES[developer]="heady-manager heady-buddy heady-ide vector-memory remote-compute agent-orchestrator"
PROFILES[full]="heady-manager heady-buddy heady-web heady-ide vector-memory remote-compute agent-orchestrator self-optimizer vector-federation heady-registry provider-benchmark sdk-services compute-dashboard corrections"
PROFILES[enterprise]="${PROFILES[full]}"

# ── Config Options ───────────────────────────────────────────────────────────
declare -A CONFIG_OPTIONS

CONFIG_OPTIONS[edge_proxy]="Cloudflare edge proxy (AI routing, CDN, mTLS)"
CONFIG_OPTIONS[gpg_signing]="GPG commit signing (key F743D004)"
CONFIG_OPTIONS[remote_ai]="Remote AI providers (HF, Gemini, Claude, Groq)"
CONFIG_OPTIONS[vector_federation]="Multi-tier vector storage (edge+gcloud+colab)"
CONFIG_OPTIONS[audit_trail]="Full JSONL audit trail for all operations"
CONFIG_OPTIONS[phi_timing]="φ-derived intervals (golden ratio timing)"
CONFIG_OPTIONS[desktop_launcher]="Desktop shortcut with status/stop/update actions"
CONFIG_OPTIONS[systemd_service]="Systemd service for auto-start on boot"
CONFIG_OPTIONS[seo_essentials]="SEO: favicon, robots.txt, sitemap, manifest, OG tags"

# Profile → config mappings
declare -A PROFILE_CONFIGS
PROFILE_CONFIGS[minimal]="phi_timing desktop_launcher"
PROFILE_CONFIGS[developer]="edge_proxy remote_ai phi_timing desktop_launcher audit_trail"
PROFILE_CONFIGS[full]="edge_proxy gpg_signing remote_ai vector_federation audit_trail phi_timing desktop_launcher seo_essentials"
PROFILE_CONFIGS[enterprise]="edge_proxy gpg_signing remote_ai vector_federation audit_trail phi_timing desktop_launcher systemd_service seo_essentials"

# ── Profile Information ──────────────────────────────────────────────────────
list_profiles() {
    echo -e "\n${P}  ── Available Profiles ──${N}\n"
    echo -e "  ${W}minimal${N}     HeadyBuddy only. Local AI. Lightweight."
    echo -e "              Components: ${D}${PROFILES[minimal]}${N}"
    echo -e "              Configs: ${D}${PROFILE_CONFIGS[minimal]}${N}\n"

    echo -e "  ${W}developer${N}   Manager + Buddy + IDE. Edge proxy. Remote AI."
    echo -e "              Components: ${D}${PROFILES[developer]}${N}"
    echo -e "              Configs: ${D}${PROFILE_CONFIGS[developer]}${N}\n"

    echo -e "  ${W}full${N}        Everything. All edge. All cloud providers."
    echo -e "              Components: ${D}${PROFILES[full]}${N}"
    echo -e "              Configs: ${D}${PROFILE_CONFIGS[full]}${N}\n"

    echo -e "  ${W}enterprise${N}  Full + mTLS, systemd, audit, GPG, federation."
    echo -e "              Components: ${D}${PROFILES[enterprise]}${N}"
    echo -e "              Configs: ${D}${PROFILE_CONFIGS[enterprise]}${N}\n"

    echo -e "  ${W}custom${N}      Interactive component/config picker.\n"
}

# ── Build Package ────────────────────────────────────────────────────────────
build_package() {
    local profile="$1"
    local output_dir="${2:-$BUILD_DIR}"
    local group_name="${3:-individual}"

    mkdir -p "$output_dir"

    echo -e "\n${P}  ── Building Heady Package ──${N}\n"
    echo -e "  Profile: ${W}${profile}${N}"
    echo -e "  Group:   ${W}${group_name}${N}"
    echo -e "  Output:  ${W}${output_dir}${N}\n"

    local components="${PROFILES[$profile]}"
    local configs="${PROFILE_CONFIGS[$profile]}"

    # ── Generate launcher script ──
    cat > "$output_dir/heady-launcher.sh" << 'LAUNCHER_HEAD'
#!/bin/bash
# ╔══════════════════════════════════════════════════════════════════╗
# ║  HEADY — Custom Package Launcher                               ║
# ║  ∞ Sacred Geometry ∞  Auto-Generated by Package Builder         ║
# ╚══════════════════════════════════════════════════════════════════╝
set -u
LAUNCHER_HEAD

    echo "# Profile: $profile" >> "$output_dir/heady-launcher.sh"
    echo "# Group: $group_name" >> "$output_dir/heady-launcher.sh"
    echo "# Generated: $(date -Iseconds)" >> "$output_dir/heady-launcher.sh"
    echo "# PHI: $PHI" >> "$output_dir/heady-launcher.sh"
    echo "" >> "$output_dir/heady-launcher.sh"

    # Component install
    for comp in $components; do
        for entry in "${COMPONENTS[@]}"; do
            local name=$(echo "$entry" | cut -d'|' -f1)
            local dir=$(echo "$entry" | cut -d'|' -f2)
            local desc=$(echo "$entry" | cut -d'|' -f5)
            if [ "$name" = "$comp" ]; then
                ok "Including: $name ($desc)"
                echo "# Component: $name — $desc" >> "$output_dir/heady-launcher.sh"
            fi
        done
    done

    # Config options
    echo "" >> "$output_dir/heady-launcher.sh"
    echo "# ── Configuration ──" >> "$output_dir/heady-launcher.sh"
    for cfg in $configs; do
        local desc="${CONFIG_OPTIONS[$cfg]:-$cfg}"
        ok "Config: $cfg ($desc)"
        echo "HEADY_${cfg^^}=true  # $desc" >> "$output_dir/heady-launcher.sh"
    done

    chmod +x "$output_dir/heady-launcher.sh"

    # ── Generate manifest ──
    cat > "$output_dir/manifest.json" << MANIFEST
{
    "name": "heady-package",
    "profile": "$profile",
    "group": "$group_name",
    "generated": "$(date -Iseconds)",
    "phi": $PHI,
    "components": "$(echo $components | tr ' ' ',')",
    "configs": "$(echo $configs | tr ' ' ',')",
    "version": "3.0.0"
}
MANIFEST

    # ── Generate .env template ──
    cat > "$output_dir/.env.template" << ENVTPL
# Heady Package Environment — Profile: $profile
# Copy this to .env and fill in your values

# Core
HEADY_API_KEY=heady_api_key_001

# Remote AI (if enabled)
HF_TOKEN=
GOOGLE_API_KEY=
ANTHROPIC_API_KEY=

# Edge (if enabled)
CLOUDFLARE_API_TOKEN=
CLOUDFLARE_ACCOUNT_ID=

# Federation (if enabled)
GCLOUD_PROJECT_ID=
HEADY_COLAB_WORKER_URL=
CF_VECTORIZE_INDEX=heady-memory
ENVTPL

    echo ""
    ok "Package built: $output_dir"
    ok "Manifest: $output_dir/manifest.json"
    ok "Launcher: $output_dir/heady-launcher.sh"
    ok "Env template: $output_dir/.env.template"

    local total_size=$(du -sh "$output_dir" 2>/dev/null | awk '{print $1}')
    echo -e "\n  ${P}Package: ${W}${total_size}${N} → ${W}${output_dir}${N}\n"
}

# ── Interactive Custom Mode ──────────────────────────────────────────────────
custom_mode() {
    echo -e "\n${P}  ── Custom Package Builder ──${N}\n"
    
    local selected_components=""
    local selected_configs=""

    echo -e "  ${W}Select components:${N} (y/n for each)\n"
    for entry in "${COMPONENTS[@]}"; do
        local name=$(echo "$entry" | cut -d'|' -f1)
        local type=$(echo "$entry" | cut -d'|' -f3)
        local size=$(echo "$entry" | cut -d'|' -f4)
        local desc=$(echo "$entry" | cut -d'|' -f5)
        
        echo -ne "  ${C}[$type]${N} $name ${D}($size)${N} — $desc [y/N] "
        read -r yn
        if [[ "$yn" =~ ^[Yy] ]]; then
            selected_components="$selected_components $name"
        fi
    done

    echo -e "\n  ${W}Select configurations:${N}\n"
    for cfg in "${!CONFIG_OPTIONS[@]}"; do
        local desc="${CONFIG_OPTIONS[$cfg]}"
        echo -ne "  $cfg — $desc [y/N] "
        read -r yn
        if [[ "$yn" =~ ^[Yy] ]]; then
            selected_configs="$selected_configs $cfg"
        fi
    done

    PROFILES[custom]="${selected_components# }"
    PROFILE_CONFIGS[custom]="${selected_configs# }"

    echo -ne "\n  Group name [individual]: "
    read -r group
    group="${group:-individual}"

    echo -ne "  Output directory [/tmp/heady-custom]: "
    read -r outdir
    outdir="${outdir:-/tmp/heady-custom}"

    build_package "custom" "$outdir" "$group"
}

# ── Entry Point ──────────────────────────────────────────────────────────────
PROFILE=""
OUTPUT=""
GROUP="individual"

while [[ $# -gt 0 ]]; do
    case "$1" in
        --profile)   PROFILE="$2"; shift 2 ;;
        --output)    OUTPUT="$2"; shift 2 ;;
        --group)     GROUP="$2"; shift 2 ;;
        --list-profiles) list_profiles; exit 0 ;;
        --help)
            echo "Usage: $0 --profile <minimal|developer|full|enterprise|custom> [--output DIR] [--group NAME]"
            echo "       $0 --list-profiles"
            exit 0 ;;
        *) echo "Unknown: $1"; exit 1 ;;
    esac
done

if [ -z "$PROFILE" ]; then
    list_profiles
    echo -ne "  Select profile: "
    read -r PROFILE
fi

if [ "$PROFILE" = "custom" ]; then
    custom_mode
else
    if [ -z "${PROFILES[$PROFILE]+x}" ]; then
        err "Unknown profile: $PROFILE"
        list_profiles
        exit 1
    fi
    build_package "$PROFILE" "${OUTPUT:-/tmp/heady-$PROFILE}" "$GROUP"
fi

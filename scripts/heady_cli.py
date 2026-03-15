#!/usr/bin/env python3
# HEADY_BRAND:BEGIN
# ╔══════════════════════════════════════════════════════════════════╗
# ║  ██╗  ██╗███████╗ █████╗ ██████╗ ██╗   ██╗                     ║
# ║  ██║  ██║██╔════╝██╔══██╗██╔══██╗╚██╗ ██╔╝                     ║
# ║  ███████║█████╗  ███████║██║  ██║ ╚████╔╝                      ║
# ║  ██╔══██║██╔══╝  ██╔══██║██║  ██║  ╚██╔╝                       ║
# ║  ██║  ██║███████╗██║  ██║██████╔╝   ██║                        ║
# ║  ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═════╝    ╚═╝                        ║
# ║                                                                  ║
# ║  ∞ SACRED GEOMETRY ∞  Organic Systems · Breathing Interfaces    ║
# ║  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ║
# ║  FILE: scripts/heady_cli.py                                                    ║
# ║  LAYER: automation                                                  ║
# ╚══════════════════════════════════════════════════════════════════╝
# HEADY_BRAND:END
"""
Heady Python CLI — Sacred Geometry Command Interface

Usage:
    python scripts/heady_cli.py status
    python scripts/heady_cli.py health
    python scripts/heady_cli.py profile
    python scripts/heady_cli.py pipeline [run|state|history]
    python scripts/heady_cli.py brain [status|tune]
    python scripts/heady_cli.py registry [list|component <name>]
"""
import argparse
import json
import os
import platform
import sys
import time

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from services.heady_client import HeadyClient
except ImportError:
    HeadyClient = None


# ─── ANSI Color Palette — Sacred Geometry Tones ──────────────────────────────

class C:
    """Sacred Geometry color palette."""
    RESET   = '\033[0m'
    BOLD    = '\033[1m'
    DIM     = '\033[2m'
    GOLD    = '\033[38;5;220m'
    VIOLET  = '\033[38;5;141m'
    TEAL    = '\033[38;5;80m'
    ROSE    = '\033[38;5;204m'
    EMERALD = '\033[38;5;48m'
    AMBER   = '\033[38;5;214m'
    SKY     = '\033[38;5;117m'
    RED     = '\033[38;5;196m'
    GRAY    = '\033[38;5;243m'


# ─── Sacred Geometry Display ─────────────────────────────────────────────────

def print_banner():
    v = C.VIOLET
    g = C.GOLD
    t = C.TEAL
    b = C.BOLD
    d = C.DIM
    s = C.SKY
    r = C.RESET

    print()
    print(f"{v}    ╔══════════════════════════════════════════════════════════════╗{r}")
    print(f"{v}    ║{r}  {g}{b}██╗  ██╗███████╗ █████╗ ██████╗ ██╗   ██╗{r}                {v}║{r}")
    print(f"{v}    ║{r}  {g}{b}██║  ██║██╔════╝██╔══██╗██╔══██╗╚██╗ ██╔╝{r}                {v}║{r}")
    print(f"{v}    ║{r}  {g}{b}███████║█████╗  ███████║██║  ██║ ╚████╔╝{r}                 {v}║{r}")
    print(f"{v}    ║{r}  {g}{b}██╔══██║██╔══╝  ██╔══██║██║  ██║  ╚██╔╝{r}                  {v}║{r}")
    print(f"{v}    ║{r}  {g}{b}██║  ██║███████╗██║  ██║██████╔╝   ██║{r}                   {v}║{r}")
    print(f"{v}    ║{r}  {g}{b}╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═════╝    ╚═╝{r}                   {v}║{r}")
    print(f"{v}    ║{r}                                                              {v}║{r}")
    print(f"{v}    ║{r}  {t}∞ SACRED GEOMETRY ∞{r}  {d}Organic Systems · Breathing Interfaces{r}  {v}║{r}")
    print(f"{v}    ╠══════════════════════════════════════════════════════════════╣{r}")
    print(f"{v}    ║{r}  {s}Heady Python CLI{r} {d}v3.0.0{r}  {d}·{r}  {v}◈ ◇ ◆{r}                       {v}║{r}")
    print(f"{v}    ╚══════════════════════════════════════════════════════════════╝{r}")
    print()


def print_small_banner():
    print()
    print(f"  {C.VIOLET}◈{C.RESET} {C.GOLD}{C.BOLD}HEADY{C.RESET} {C.DIM}·{C.RESET} {C.TEAL}Sacred Geometry Python CLI{C.RESET} {C.DIM}v3.0.0{C.RESET} {C.VIOLET}◈{C.RESET}")
    print(f"  {C.VIOLET}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{C.RESET}")


def section_header(title, icon="◇"):
    print(f"\n  {C.VIOLET}{icon}{C.RESET} {C.TEAL}{C.BOLD}{title}{C.RESET}")
    print(f"  {C.DIM}{'─' * 40}{C.RESET}")


def ok(msg):
    print(f"  {C.EMERALD}✔{C.RESET} {msg}")


def warn(msg):
    print(f"  {C.AMBER}⚠{C.RESET} {msg}")


def err(msg):
    print(f"  {C.RED}✖{C.RESET} {msg}")


def info(msg):
    print(f"  {C.SKY}◈{C.RESET} {msg}")


def kv(key, value, color=None):
    color = color or C.RESET
    print(f"  {C.DIM}{key:<14}{C.RESET} {color}{value}{C.RESET}")


def flower_of_life():
    v, g, t, d, r = C.VIOLET, C.GOLD, C.TEAL, C.DIM, C.RESET
    print(f"  {d}        ·{r}")
    print(f"  {d}      ·{r} {v}◈{r} {d}·{r}")
    print(f"  {d}    ·{r} {t}◇{r} {g}◆{r} {t}◇{r} {d}·{r}")
    print(f"  {d}      ·{r} {v}◈{r} {d}·{r}")
    print(f"  {d}        ·{r}")


# ─── Client Helper ───────────────────────────────────────────────────────────

def get_client():
    """Create a HeadyClient from environment variables."""
    if HeadyClient is None:
        err("HeadyClient module not found. Ensure services/heady_client.py exists.")
        sys.exit(1)

    base_url = os.getenv("HEADY_ACTIVE_ENDPOINT") or os.getenv("HEADY_BASE_URL", "http://localhost:3300")
    api_key = os.getenv("HEADY_API_KEY", "")

    return HeadyClient(base_url=base_url, api_key=api_key)


def api_call(method, endpoint, data=None, quiet=False):
    """Make an API call and handle errors gracefully."""
    client = get_client()
    try:
        if method == "GET":
            result = client.get(endpoint)
        elif method == "POST":
            result = client.post(endpoint, data or {})
        else:
            err(f"Unknown method: {method}")
            return None
        return result
    except Exception as exc:
        if not quiet:
            err(f"API call failed: {exc}")
        return None
    finally:
        client.close()


# ─── Commands ────────────────────────────────────────────────────────────────

def cmd_status(_args):
    """System status and environment check."""
    print_banner()
    section_header("Environment", "◆")

    kv("Python", f"{platform.python_version()} ({platform.python_implementation()})", C.EMERALD)
    kv("Platform", f"{platform.system()} {platform.release()}", C.SKY)
    kv("Architecture", platform.machine(), C.SKY)
    kv("Node", os.getenv("NODE_ENV", "not set"), C.TEAL)

    section_header("Heady Configuration", "◇")

    base_url = os.getenv("HEADY_ACTIVE_ENDPOINT") or os.getenv("HEADY_BASE_URL", "http://localhost:3300")
    api_key = os.getenv("HEADY_API_KEY", "")
    cloud_mode = os.getenv("HEADY_CLOUD_MODE", "false")

    kv("Endpoint", base_url, C.GOLD)
    kv("API Key", "configured" if api_key else "NOT SET", C.EMERALD if api_key else C.AMBER)
    kv("Cloud Mode", cloud_mode, C.TEAL if cloud_mode == "true" else C.DIM)
    kv("Version", os.getenv("HEADY_VERSION", "3.0.0"), C.GOLD)

    section_header("Service Health", "◈")
    client = get_client()
    healthy = client.health_check()
    client.close()

    if healthy:
        ok(f"Manager reachable at {base_url}")
    else:
        warn(f"Manager not reachable at {base_url}")

    print()
    flower_of_life()
    print()


def cmd_health(_args):
    """Quick health check against the manager."""
    print_small_banner()
    section_header("Health Check", "◈")

    base_url = os.getenv("HEADY_ACTIVE_ENDPOINT") or os.getenv("HEADY_BASE_URL", "http://localhost:3300")

    result = api_call("GET", "/api/health", quiet=True)
    if result:
        ok(f"Manager healthy at {base_url}")
        if isinstance(result, dict):
            for k, v in result.items():
                kv(k, str(v), C.TEAL)
    else:
        err(f"Manager not responding at {base_url}")
    print()


def cmd_profile(_args):
    """Fetch user profile from the API."""
    print_small_banner()
    section_header("User Profile", "◈")

    result = api_call("GET", "/me")
    if result:
        ok("Connected to Heady!")
        if isinstance(result, dict):
            for k, v in result.items():
                kv(str(k), str(v), C.TEAL)
        else:
            print(f"  {json.dumps(result, indent=2)}")
    print()


def cmd_pipeline(args):
    """Pipeline operations: run, state, history."""
    print_small_banner()
    sub = args.pipeline_sub if hasattr(args, 'pipeline_sub') and args.pipeline_sub else "state"

    if sub == "run":
        section_header("Pipeline Run", "▶")
        info("Triggering pipeline execution...")
        result = api_call("POST", "/api/pipeline/run")
        if result:
            ok("Pipeline triggered successfully.")
            if isinstance(result, dict):
                for k, v in result.items():
                    kv(str(k), str(v), C.TEAL)
    elif sub == "state":
        section_header("Pipeline State", "◈")
        result = api_call("GET", "/api/pipeline/state")
        if result:
            if isinstance(result, dict):
                for k, v in result.items():
                    color = C.EMERALD if v in ("complete", "running", True) else C.AMBER
                    kv(str(k), str(v), color)
            else:
                print(f"  {json.dumps(result, indent=2)}")
        else:
            warn("Could not retrieve pipeline state.")
    elif sub == "history":
        section_header("Pipeline History", "◇")
        result = api_call("GET", "/api/pipeline/history")
        if result:
            if isinstance(result, list):
                for i, run in enumerate(result[-10:]):
                    status = run.get("status", "unknown")
                    color = C.EMERALD if status == "success" else C.RED if status == "failed" else C.AMBER
                    print(f"  {C.GOLD}{i+1}.{C.RESET} {color}{status}{C.RESET}  {C.DIM}{run.get('timestamp', '')}{C.RESET}")
            else:
                print(f"  {json.dumps(result, indent=2)}")
        else:
            warn("Could not retrieve pipeline history.")
    else:
        warn(f"Unknown pipeline sub-command: {sub}")
        info("Available: run, state, history")
    print()


def cmd_brain(args):
    """Brain operations: status, tune."""
    print_small_banner()
    sub = args.brain_sub if hasattr(args, 'brain_sub') and args.brain_sub else "status"

    if sub == "status":
        section_header("System Brain", "◈")
        result = api_call("GET", "/api/brain/status")
        if result:
            if isinstance(result, dict):
                for k, v in result.items():
                    kv(str(k), str(v), C.TEAL)
            else:
                print(f"  {json.dumps(result, indent=2)}")
        else:
            warn("Brain not responding. Is the manager running?")
    elif sub == "tune":
        section_header("Brain Auto-Tune", "⚡")
        info("Sending auto-tune request...")
        result = api_call("POST", "/api/brain/tune", {"errorRate": 0.05})
        if result:
            ok("Auto-tune complete.")
            if isinstance(result, dict):
                for k, v in result.items():
                    kv(str(k), str(v), C.TEAL)
    else:
        warn(f"Unknown brain sub-command: {sub}")
        info("Available: status, tune")
    print()


def cmd_registry(args):
    """Registry operations: list, component."""
    print_small_banner()
    sub = args.registry_sub if hasattr(args, 'registry_sub') and args.registry_sub else "list"

    if sub == "list":
        section_header("Registry Catalog", "◇")
        result = api_call("GET", "/api/registry")
        if result:
            if isinstance(result, dict):
                for category, items in result.items():
                    print(f"\n  {C.GOLD}{C.BOLD}{category}{C.RESET}")
                    if isinstance(items, list):
                        for item in items:
                            name = item.get("name", item) if isinstance(item, dict) else str(item)
                            print(f"    {C.VIOLET}◈{C.RESET} {name}")
                    elif isinstance(items, dict):
                        for k, v in items.items():
                            kv(f"  {k}", str(v), C.TEAL)
            else:
                print(f"  {json.dumps(result, indent=2)}")
        else:
            warn("Could not reach registry.")
    elif sub == "component":
        name = args.component_name if hasattr(args, 'component_name') and args.component_name else None
        if not name:
            warn("Usage: heady_cli.py registry component <name>")
            print()
            return
        section_header(f"Component: {name}", "◈")
        result = api_call("GET", f"/api/registry/component/{name}")
        if result:
            if isinstance(result, dict):
                for k, v in result.items():
                    kv(str(k), str(v), C.TEAL)
            else:
                print(f"  {json.dumps(result, indent=2)}")
        else:
            warn(f"Component '{name}' not found.")
    else:
        warn(f"Unknown registry sub-command: {sub}")
        info("Available: list, component <name>")
    print()


def cmd_nodes(_args):
    """Show node status."""
    print_small_banner()
    section_header("Node Status", "◈")

    result = api_call("GET", "/api/nodes")
    if result:
        if isinstance(result, list):
            for node in result:
                name = node.get("name", "unknown") if isinstance(node, dict) else str(node)
                status = node.get("status", "unknown") if isinstance(node, dict) else "?"
                color = C.EMERALD if status in ("healthy", "active", "online") else C.RED
                print(f"  {C.VIOLET}◈{C.RESET} {name:<20} {color}{status}{C.RESET}")
        elif isinstance(result, dict):
            for k, v in result.items():
                kv(str(k), str(v), C.TEAL)
    else:
        warn("Could not retrieve node status.")
    print()


# ─── Argument Parser ────────────────────────────────────────────────────────

def build_parser():
    parser = argparse.ArgumentParser(
        prog="heady",
        description="Heady Python CLI — Sacred Geometry Command Interface",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=f"""
{C.VIOLET}◈{C.RESET} {C.TEAL}Examples:{C.RESET}
  heady status                  System status & health
  heady health                  Quick health check
  heady profile                 Fetch user profile
  heady pipeline state          Current pipeline state
  heady pipeline run            Trigger pipeline run
  heady brain status            Brain controller status
  heady registry list           List all registry entries
  heady nodes                   Show node status

{C.DIM}Set HEADY_ACTIVE_ENDPOINT or HEADY_BASE_URL to target a specific instance.{C.RESET}
"""
    )

    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    subparsers.add_parser("status", help="System status and environment check")
    subparsers.add_parser("health", help="Quick health check")
    subparsers.add_parser("profile", help="Fetch user profile")

    pipe_parser = subparsers.add_parser("pipeline", help="Pipeline operations")
    pipe_parser.add_argument("pipeline_sub", nargs="?", default="state",
                             choices=["run", "state", "history"],
                             help="Pipeline sub-command (default: state)")

    brain_parser = subparsers.add_parser("brain", help="Brain controller operations")
    brain_parser.add_argument("brain_sub", nargs="?", default="status",
                              choices=["status", "tune"],
                              help="Brain sub-command (default: status)")

    reg_parser = subparsers.add_parser("registry", help="Registry operations")
    reg_parser.add_argument("registry_sub", nargs="?", default="list",
                            choices=["list", "component"],
                            help="Registry sub-command (default: list)")
    reg_parser.add_argument("component_name", nargs="?", default=None,
                            help="Component name (for 'component' sub-command)")

    subparsers.add_parser("nodes", help="Show node status")

    return parser


# ─── Main ────────────────────────────────────────────────────────────────────

DISPATCH = {
    "status": cmd_status,
    "health": cmd_health,
    "profile": cmd_profile,
    "pipeline": cmd_pipeline,
    "brain": cmd_brain,
    "registry": cmd_registry,
    "nodes": cmd_nodes,
}

if __name__ == "__main__":
    parser = build_parser()
    args = parser.parse_args()

    if not args.command:
        print_banner()
        parser.print_help()
        print()
        flower_of_life()
        print()
        sys.exit(0)

    handler = DISPATCH.get(args.command)
    if handler:
        handler(args)
    else:
        err(f"Unknown command: {args.command}")
        sys.exit(1)

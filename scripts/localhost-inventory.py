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
# ║  FILE: scripts/localhost-inventory.py                                                    ║
# ║  LAYER: automation                                                  ║
# ╚══════════════════════════════════════════════════════════════════╝
# HEADY_BRAND:END
"""
Heady Localhost Inventory Scanner
Scans codebase for localhost/127.0.0.1 references and maps to service domains
"""

import re
import json
import yaml
from pathlib import Path
from typing import Dict, List, Set, Tuple
from dataclasses import dataclass, asdict

@dataclass
class LocalhostRef:
    file_path: str
    line_number: int
    line_content: str
    match_type: str  # localhost, 127.0.0.1, 0.0.0.0, ::1
    port: int
    context: str  # url, config, code, docker, k8s
    service_name: str = "unknown"
    recommended_domain: str = ""
    security_level: str = "unknown"

class LocalhostInventory:
    PATTERNS = {
        'localhost_url': re.compile(r'(?:http|https|ws|wss)://localhost[:/](\d+)', re.IGNORECASE),
        'localhost_direct': re.compile(r'localhost[:/](\d+)', re.IGNORECASE),
        '127_url': re.compile(r'(?:http|https|ws|wss)://127\.0\.0\.1[:/](\d+)', re.IGNORECASE),
        '127_direct': re.compile(r'127\.0\.0\.1[:/](\d+)'),
        'zero_url': re.compile(r'(?:http|https|ws|wss)://0\.0\.0\.0[:/](\d+)', re.IGNORECASE),
        'zero_direct': re.compile(r'0\.0\.0\.0[:/](\d+)'),
        'ipv6_url': re.compile(r'(?:http|https|ws|wss)://\[?::1\]?[:/](\d+)', re.IGNORECASE),
        'ipv6_direct': re.compile(r'\[?::1\]?[:/](\d+)'),
    }
    
    # Port to service mapping
    PORT_SERVICES = {
        3300: ('manager', 'manager.dev.local.heady.internal', 'internal'),
        3301: ('buddy', 'app-buddy.dev.local.heady.internal', 'internal'),
        3302: ('browser-bridge', 'bridge-browser.dev.local.heady.internal', 'internal'),
        3303: ('voice', 'io-voice.dev.local.heady.internal', 'internal'),
        3304: ('billing', 'svc-billing.dev.local.heady.internal', 'internal'),
        3305: ('telemetry', 'svc-telemetry.dev.local.heady.internal', 'internal'),
        3000: ('web', 'app-web.dev.local.heady.internal', 'external'),
        3001: ('mcp-gateway', 'tools-mcp.dev.local.heady.internal', 'internal'),
        5432: ('postgres', 'db-postgres.dev.local.heady.internal', 'database'),
        6379: ('redis', 'db-redis.dev.local.heady.internal', 'database'),
        8080: ('rag', 'ai-rag.dev.local.heady.internal', 'internal'),
        11434: ('ollama', 'ai-ollama.dev.local.heady.internal', 'internal'),
        8600: ('discovery', 'discovery.dev.local.heady.internal', 'internal'),
        9090: ('debug', 'debug-manager.dev.local.heady.internal', 'admin'),
        80: ('gateway', 'gateway.dev.local.heady.internal', 'external'),
        443: ('gateway-secure', 'gateway.dev.local.heady.internal', 'external'),
    }
    
    def __init__(self, root_path: str):
        self.root = Path(root_path)
        self.refs: List[LocalhostRef] = []
        
    def scan_file(self, file_path: Path) -> List[LocalhostRef]:
        """Scan a single file for localhost references"""
        refs = []
        
        try:
            content = file_path.read_text(encoding='utf-8', errors='ignore')
            lines = content.split('\n')
        except:
            return refs
        
        for line_num, line in enumerate(lines, 1):
            for pattern_name, pattern in self.PATTERNS.items():
                matches = pattern.finditer(line)
                for match in matches:
                    try:
                        port = int(match.group(1))
                    except:
                        port = 0
                    
                    # Determine context
                    context = self._determine_context(file_path, line)
                    
                    # Get service info
                    service_info = self.PORT_SERVICES.get(port, ('unknown', f'svc-{port}.dev.local.heady.internal', 'unknown'))
                    
                    ref = LocalhostRef(
                        file_path=str(file_path.relative_to(self.root)),
                        line_number=line_num,
                        line_content=line.strip(),
                        match_type=pattern_name,
                        port=port,
                        context=context,
                        service_name=service_info[0],
                        recommended_domain=f"{service_info[1]}:{port}",
                        security_level=service_info[2]
                    )
                    refs.append(ref)
        
        return refs
    
    def _determine_context(self, file_path: Path, line: str) -> str:
        """Determine the context of the localhost reference"""
        line_lower = line.lower()
        
        if 'docker' in str(file_path).lower() or 'docker-compose' in line_lower:
            return 'docker'
        elif 'kubernetes' in str(file_path).lower() or '.yaml' in str(file_path) or '.yml' in str(file_path):
            return 'k8s'
        elif 'config' in str(file_path).lower() or '.env' in str(file_path):
            return 'config'
        elif any(x in line_lower for x in ['fetch(', 'axios', 'http', 'request', 'url']):
            return 'code'
        else:
            return 'unknown'
    
    def scan_directory(self, extensions: Set[str] = None) -> List[LocalhostRef]:
        """Scan entire directory for localhost references"""
        if extensions is None:
            extensions = {'.js', '.ts', '.py', '.json', '.yaml', '.yml', '.env', '.md', '.sh', '.ps1', '.html'}
        
        self.refs = []
        
        for ext in extensions:
            for file_path in self.root.rglob(f'*{ext}'):
                if '.git' in str(file_path):
                    continue
                if 'node_modules' in str(file_path):
                    continue
                if '.heady_cache' in str(file_path):
                    continue
                    
                refs = self.scan_file(file_path)
                self.refs.extend(refs)
        
        return self.refs
    
    def generate_report(self) -> Dict:
        """Generate comprehensive inventory report"""
        
        # Group by service
        by_service: Dict[str, List[LocalhostRef]] = {}
        for ref in self.refs:
            if ref.service_name not in by_service:
                by_service[ref.service_name] = []
            by_service[ref.service_name].append(ref)
        
        # Group by file
        by_file: Dict[str, List[LocalhostRef]] = {}
        for ref in self.refs:
            if ref.file_path not in by_file:
                by_file[ref.file_path] = []
            by_file[ref.file_path].append(ref)
        
        # Group by security level
        by_security: Dict[str, List[LocalhostRef]] = {}
        for ref in self.refs:
            if ref.security_level not in by_security:
                by_security[ref.security_level] = []
            by_security[ref.security_level].append(ref)
        
        # Find critical issues (no auth, exposed)
        critical = [r for r in self.refs if r.security_level in ['unknown', 'external'] and 'admin' not in r.service_name]
        
        return {
            'summary': {
                'total_refs': len(self.refs),
                'files_affected': len(by_file),
                'services_mapped': len(by_service),
                'critical_issues': len(critical)
            },
            'by_service': {k: [asdict(r) for r in v] for k, v in by_service.items()},
            'by_file': {k: [asdict(r) for r in v] for k, v in by_file.items()},
            'by_security': {k: len(v) for k, v in by_security.items()},
            'critical_issues': [asdict(r) for r in critical[:20]],  # Top 20
            'migration_plan': self._generate_migration_plan(by_service)
        }
    
    def _generate_migration_plan(self, by_service: Dict) -> List[Dict]:
        """Generate migration plan for each service"""
        plan = []
        
        for service_name, refs in by_service.items():
            if not refs:
                continue
                
            sample = refs[0]
            plan.append({
                'service': service_name,
                'current_refs': len(refs),
                'target_domain': sample.recommended_domain,
                'security_level': sample.security_level,
                'priority': 'high' if sample.security_level == 'external' else 'medium',
                'files_to_update': list(set(r.file_path for r in refs)),
                'verification_steps': [
                    f'Update DNS record for {sample.recommended_domain}',
                    f'Configure service to bind to {sample.recommended_domain}',
                    f'Update all client references in code',
                    f'Add mTLS if security_level={sample.security_level}',
                    f'Update firewall rules',
                    f'Test connectivity'
                ]
            })
        
        return sorted(plan, key=lambda x: 0 if x['priority'] == 'high' else 1)
    
    def export_csv(self, output_path: str):
        """Export inventory to CSV"""
        import csv
        
        with open(output_path, 'w', newline='') as f:
            writer = csv.writer(f)
            writer.writerow(['file_path', 'line_number', 'line_content', 'match_type', 
                           'port', 'context', 'service_name', 'recommended_domain', 'security_level'])
            
            for ref in self.refs:
                writer.writerow([
                    ref.file_path, ref.line_number, ref.line_content[:100],
                    ref.match_type, ref.port, ref.context, ref.service_name,
                    ref.recommended_domain, ref.security_level
                ])
    
    def export_yaml(self, output_path: str):
        """Export inventory to YAML"""
        report = self.generate_report()
        
        with open(output_path, 'w') as f:
            yaml.dump(report, f, default_flow_style=False)


def main():
    """CLI entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Scan for localhost references')
    parser.add_argument('--root', default='.', help='Root directory to scan')
    parser.add_argument('--output', default='localhost-inventory.json', help='Output file')
    parser.add_argument('--format', choices=['json', 'yaml', 'csv'], default='json', help='Output format')
    
    args = parser.parse_args()
    
    scanner = LocalhostInventory(args.root)
    print(f"🔍 Scanning {args.root} for localhost references...")
    
    refs = scanner.scan_directory()
    print(f"✅ Found {len(refs)} localhost references")
    
    if args.format == 'json':
        report = scanner.generate_report()
        with open(args.output, 'w') as f:
            json.dump(report, f, indent=2)
    elif args.format == 'yaml':
        scanner.export_yaml(args.output)
    elif args.format == 'csv':
        scanner.export_csv(args.output)
    
    print(f"📄 Report saved to {args.output}")
    
    # Print summary
    report = scanner.generate_report()
    print(f"\n📊 Summary:")
    print(f"  - Total references: {report['summary']['total_refs']}")
    print(f"  - Files affected: {report['summary']['files_affected']}")
    print(f"  - Services to migrate: {report['summary']['services_mapped']}")
    print(f"  - Critical issues: {report['summary']['critical_issues']}")
    
    if report['critical_issues']:
        print(f"\n⚠️  Top priority migrations:")
        for issue in report['migration_plan'][:5]:
            print(f"  - {issue['service']}: {issue['current_refs']} refs → {issue['target_domain']}")


if __name__ == '__main__':
    main()

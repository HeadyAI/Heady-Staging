---
description: HCFP Localhost-to-Domain Migration - Systematically replace all localhost references with proper internal domains
---

# HCFP Localhost-to-Domain Migration Workflow

## Overview

This workflow systematically replaces all localhost references across the Heady codebase with proper internal domain names, making the system's compartmentalization explicit and discoverable.

## Objective

Transform the system from implicit localhost-based addressing to explicit domain-based service discovery:
- **Before**: Services hidden behind localhost:port
- **After**: Services discoverable via `service.env.region.heady.internal`

## Service Domain Mapping

### Core Services
```
localhost:3300    → manager.dev.local.heady.internal:3300
localhost:3000    → app-web.dev.local.heady.internal:3000
localhost:3001    → tools-mcp.dev.local.heady.internal:3001
localhost:3301    → app-buddy.dev.local.heady.internal:3301
localhost:3302    → bridge-browser.dev.local.heady.internal:3302
localhost:3303    → io-voice.dev.local.heady.internal:3303
localhost:3304    → svc-billing.dev.local.heady.internal:3304
localhost:3305    → svc-telemetry.dev.local.heady.internal:3305
```

### Database & Cache
```
localhost:5432    → db-postgres.dev.local.heady.internal:5432
localhost:6379    → db-redis.dev.local.heady.internal:6379
localhost:11434   → ai-ollama.dev.local.heady.internal:11434
```

### Admin & Debug
```
localhost:8080    → admin-postgres.dev.local.heady.internal:8080
localhost:8081    → admin-redis.dev.local.heady.internal:8081
localhost:9090    → debug-manager.dev.local.heady.internal:9090
```

## Step-by-Step Execution

### Phase 1: Preparation (Pre-Migration)

1. **Verify Current State**
   ```bash
   # Count localhost references
   grep -r "localhost\|127.0.0.1\|0.0.0.0" --include="*.js" --include="*.json" --include="*.yaml" . | wc -l
   
   # List files with localhost
   grep -r "localhost" --include="*.js" --include="*.json" --include="*.yaml" . | cut -d: -f1 | sort -u
   ```

2. **Create Feature Branch**
   ```bash
   git checkout -b feat/localhost-to-domains
   ```

3. **Backup Current State**
   ```bash
   git stash
   ```

### Phase 2: Automated Migration

4. **Run Migration Script (Dry-Run)**
   ```bash
   node scripts/migrate-localhost-to-domains.js --dry-run
   ```
   Review the output to verify replacements are correct.

5. **Execute Migration**
   ```bash
   node scripts/migrate-localhost-to-domains.js
   ```

6. **Verify Migration**
   ```bash
   node scripts/migrate-localhost-to-domains.js --verify-only
   ```
   Should report: "✅ No localhost references found!"

### Phase 3: Configuration Updates

7. **Update Environment Files**
   ```bash
   # .env
   HEADY_MANAGER_URL=http://manager.dev.local.heady.internal:3300
   DATABASE_URL=postgresql://user:pass@db-postgres.dev.local.heady.internal:5432/heady
   REDIS_URL=redis://db-redis.dev.local.heady.internal:6379
   ```

8. **Update Docker Compose**
   ```yaml
   # docker-compose.yml
   services:
     manager:
       environment:
         - DATABASE_URL=postgresql://postgres:password@db-postgres.dev.local.heady.internal:5432/heady
         - REDIS_URL=redis://db-redis.dev.local.heady.internal:6379
   ```

9. **Update Kubernetes Manifests** (if applicable)
   ```yaml
   # k8s/manager-deployment.yaml
   env:
     - name: HEADY_MANAGER_URL
       value: http://manager.dev.local.heady.internal:3300
   ```

### Phase 4: Testing

10. **Local Testing**
    ```bash
    # Start services
    npm run dev
    
    # Verify health check
    curl http://manager.dev.local.heady.internal:3300/api/health
    
    # Run integration tests
    npm run test:integration
    ```

11. **DNS Resolution Testing**
    ```bash
    # On Windows (add to hosts file)
    # C:\Windows\System32\drivers\etc\hosts
    127.0.0.1 manager.dev.local.heady.internal
    127.0.0.1 app-web.dev.local.heady.internal
    127.0.0.1 db-postgres.dev.local.heady.internal
    127.0.0.1 db-redis.dev.local.heady.internal
    
    # Test resolution
    nslookup manager.dev.local.heady.internal
    ```

12. **Run Clean Build**
    ```bash
    npm run clean-build
    ```

### Phase 5: Documentation & Commit

13. **Update Documentation**
    - Update README.md with new domain references
    - Update INFRASTRUCTURE_SETUP.md
    - Update API documentation
    - Update deployment guides

14. **Update Registry**
    ```bash
    # Update heady-registry.json
    # - Update all endpoint references
    # - Add localhost-to-domain migration entry
    # - Update service discovery config reference
    ```

15. **Commit Changes**
    ```bash
    git add .
    git commit -m "refactor: migrate localhost to internal domains

    - Replace all localhost:port references with service.env.region.heady.internal
    - Update environment files and configs
    - Update Docker Compose and K8s manifests
    - Add DNS resolution for internal domains
    - Update documentation and registry
    
    Mapping:
    - localhost:3300 → manager.dev.local.heady.internal:3300
    - localhost:5432 → db-postgres.dev.local.heady.internal:5432
    - localhost:6379 → db-redis.dev.local.heady.internal:6379
    (and 12 more service mappings)
    
    Closes #ISSUE_NUMBER"
    ```

### Phase 6: Deployment

16. **Create Pull Request**
    ```bash
    git push origin feat/localhost-to-domains
    # Create PR with description of changes
    ```

17. **CI/CD Pipeline**
    - Pre-flight checks verify no localhost in production configs
    - Clean build validates all services start correctly
    - Integration tests verify service-to-service communication
    - Security scan checks for exposed internal domains

18. **Merge & Deploy**
    - Merge to main after CI passes
    - Deploy to staging first
    - Verify all services healthy
    - Deploy to production

## Verification Checklist

- [ ] No localhost references remain in code
- [ ] All environment files updated
- [ ] Docker Compose updated
- [ ] Kubernetes manifests updated (if applicable)
- [ ] DNS/hosts file configured
- [ ] Local services start and respond
- [ ] Integration tests pass
- [ ] Clean build passes
- [ ] Documentation updated
- [ ] Registry updated
- [ ] PR reviewed and approved
- [ ] Staging deployment successful
- [ ] Production deployment successful

## Rollback Plan

If issues arise:

1. **Immediate Rollback**
   ```bash
   git revert <commit-hash>
   git push origin main
   ```

2. **Restore from Backup**
   ```bash
   git checkout <previous-stable-commit>
   ```

3. **Notify Team**
   - Post to Slack
   - Create incident ticket
   - Document issue for post-mortem

## Post-Migration Benefits

### Visibility
- Services are explicitly named and discoverable
- Architecture compartmentalization is obvious from hostnames
- DNS becomes the "single pane" for service discovery

### Security
- Easier to implement network policies (block by hostname)
- mTLS can be enforced per service domain
- Access logs show service-to-service communication clearly

### Debugging
- Logs show `source_service → destination_service` flows
- Metrics keyed by service domain
- Distributed tracing shows compartment boundaries

### Scalability
- Multiple instances per service can use DNS round-robin
- Load balancers can route by hostname
- Service mesh integration becomes straightforward

## Monitoring & Alerts

### Key Metrics
- Service health by domain
- Latency by service-to-service route
- Error rates by destination service
- DNS resolution failures

### Alerts
- Service unreachable by domain
- DNS resolution failures
- Unexpected service discovery changes
- Cross-compartment communication violations

## References

- **Service Discovery Config**: `configs/service-discovery.yaml`
- **Migration Script**: `scripts/migrate-localhost-to-domains.js`
- **Clean Build Workflow**: `.github/workflows/clean-build.yml`
- **Error Recovery**: `.windsurf/workflows/hcfp-error-recovery.md`
- **Infrastructure Setup**: `docs/INFRASTRUCTURE_SETUP.md`

---
description: Deployment Command
---


## Purpose

Deploy the application to a specified environment with proper checks.

## Usage

```
/deploy [environment: staging | production]
```

---

Deploy to: **$ARGUMENTS**

## Workflow

### Pre-Deploy Checks

1. **Verify Build**
   ```bash
   pnpm build
   ```

2. **Run Tests**
   ```bash
   pnpm test
   ```

3. **Security Scan**
   ```bash
   npm audit --audit-level=high
   ```

### Deploy

1. **Staging**
   ```bash
   # Deploy to staging environment
   ```

2. **Production** (requires confirmation)
   ```bash
   # Deploy to production environment
   ```

### Post-Deploy

1. **Verify Deployment**
   - Health checks
   - Smoke tests

2. **Monitor**
   - Check logs
   - Watch metrics

## Output

```markdown
## Deployment Complete

**Environment**: staging
**Version**: v1.2.3
**URL**: https://staging.example.com

### Checks
- [x] Build successful
- [x] Tests passing
- [x] Security scan clean
- [x] Health check passed
```

---

## Next Steps & User Guidance

### Immediate Actions

1. **Monitor the Deployment**
   - [ ] Monitor application health and metrics
   - [ ] Check logs for errors or warnings
   - [ ] Verify all services are running correctly
   - [ ] Test critical user flows

2. **Next Commands to Use**
   - Use `/status` to check deployment status
   - Use `/debug [error]` if issues are found
   - Use `/fix [issue]` to address deployment problems
   - Use `/changelog` to document deployment changes
   - Use `/ship` to commit deployment configuration

3. **Update or Improve**
   - To update: Deploy fixes or updates as needed
   - To improve: Optimize deployment process
   - To extend: Add monitoring or improve CI/CD

### Related Commands

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `/status` | Check deployment status | After deployment to verify |
| `/debug` | Debug deployment issues | If problems occur |
| `/fix` | Fix deployment problems | To address issues |
| `/changelog` | Document changes | To record deployment |
| `/ship` | Commit deployment config | To save deployment changes |

### Common Workflows

**Workflow: Deploy → Monitor → Verify**
```
/deploy "staging" → Monitor → /deploy "production" → Monitor
```

**Workflow: Deploy → Debug → Fix → Redeploy**
```
/deploy "staging" → /debug "error" → /fix "issue" → /deploy "staging"
```

### Tips

- 💡 **Tip**: Always deploy to staging first
- 💡 **Tip**: Monitor deployments closely after going live
- 💡 **Tip**: Have rollback plan ready
- ⚠️ **Warning**: Don't deploy without running tests first
- ⚠️ **Warning**: Verify deployment in staging before production

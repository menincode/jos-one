# /security-scan - Security Scanning Command

## Purpose

Scan code and dependencies for security vulnerabilities.

## Usage

```
/security-scan [scope: deps | code | secrets | all]
```

---

Run security scan: **$ARGUMENTS**

## Recommended Skills & Agents

- Skill routing source: `.cursor/commands/skill-agent-routing.md` (`/security-scan`)
- Preferred skills: `security-owasp`, `audit-dependencies`, `methodology-defense-in-depth`
- Recommended agents:
  - `security-auditor` for OWASP-path analysis
  - `scout` for dependency/import reachability audits

## Workflow

### Dependency Scan

```bash
npm audit
pip-audit
```

### Code Scan

- SQL injection patterns
- XSS vulnerabilities
- Command injection

### Secret Detection

- API keys
- Passwords
- Tokens

## Output

```markdown
## Security Scan Results

### Summary
| Type | Critical | High | Medium |
|------|----------|------|--------|
| Dependencies | 0 | 2 | 5 |
| Code | 0 | 1 | 3 |
| Secrets | 0 | 0 | 0 |

### Findings
[Detailed findings with remediation]
```

---

## Next Steps & User Guidance

### Immediate Actions

1. **Review the Security Scan**
   - [ ] Prioritize critical and high severity issues
   - [ ] Review all findings for false positives
   - [ ] Check remediation recommendations
   - [ ] Plan fixes for identified vulnerabilities

2. **Next Commands to Use**
   - Use `/fix [vulnerability]` to fix identified issues
   - Use `/review [file]` to review security fixes
   - Use `/test [scope]` to verify fixes don't break functionality
   - Use `/ship [message]` to commit security fixes
   - Use `/deploy [env]` after fixing critical issues

3. **Update or Improve**
   - To update: Fix vulnerabilities and rescan
   - To improve: Add security tests or improve scanning
   - To extend: Set up automated security scanning

### Related Commands

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `/fix` | Fix vulnerabilities | To address security issues |
| `/review` | Review fixes | To verify security fixes |
| `/test` | Test fixes | To ensure fixes work correctly |
| `/ship` | Commit fixes | To save security improvements |
| `/deploy` | Deploy fixes | To deploy security patches |

### Common Workflows

**Workflow: Scan → Fix → Rescan → Ship**
```
/security-scan "all" → /fix "vulnerability" → /security-scan "all" → /ship "security: fix"
```

**Workflow: Scan → Review → Fix → Deploy**
```
/security-scan "deps" → Review → /fix "deps" → /deploy "staging"
```

### Tips

- 💡 **Tip**: Run security scans regularly
- 💡 **Tip**: Fix critical issues immediately
- 💡 **Tip**: Keep dependencies up-to-date
- ⚠️ **Warning**: Don't ignore security warnings
- ⚠️ **Warning**: Fix critical vulnerabilities before deploying

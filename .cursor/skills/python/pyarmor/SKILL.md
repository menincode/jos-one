---
name: pyarmor-security
user-invocable: true
description: >
  Securely obfuscate and license Python applications with Pyarmor, including
  script obfuscation, machine binding, expiration, and bundle workflows. Use
  when users mention pyarmor, obfuscation, protect python source, bind to
  machine, trial expiry, or packaging obfuscated apps.
---

# Pyarmor Security

## What this skill does

- Guides secure Pyarmor usage for Python source-code protection.
- Applies practical workflows for obfuscation, runtime validation, and packaging.
- Helps avoid common anti-patterns (shipping untested obfuscated builds, overexposed runtime, weak distribution checks).
- Produces repeatable command-level steps for development and release.

## When to use

Use this skill when the task includes:

- "Obfuscate Python code"
- "Protect source before release"
- "Bind app to one machine"
- "Set app expiration / trial expiry"
- "Pack obfuscated app with PyInstaller"
- "Harden Python desktop/client distribution"

## Quick workflow

1. **Define protection goal**
   - Code privacy only
   - Trial/expiry enforcement
   - Device-bound distribution
2. **Obfuscate entry script**
   - Default first: `pyarmor gen <entry.py>`
3. **Run the obfuscated artifact**
   - Validate behavior using `python dist/<entry.py>`
4. **Add licensing constraints (if needed)**
   - Machine binding and/or expiration policy
5. **Package and verify**
   - Bundle with your packager and retest startup + critical flows

## Core guardrails

- Treat obfuscation as **defense-in-depth**, not full tamper-proof protection.
- Keep secrets in environment/secure stores; never rely on obfuscation to hide credentials.
- Always verify obfuscated output with functional tests before packaging.
- Minimize exposed attack surface in runtime APIs and command-line arguments.
- Maintain reproducible build scripts and version pinning for release consistency.

## Standard playbook

### 1) Baseline install

```bash
pip install pyarmor
```

### 2) Baseline obfuscation

```bash
pyarmor gen foo.py
python dist/foo.py
```

### 3) Policy hardening

- Add expiration policy for trial builds.
- Add machine-binding for controlled deployments.
- Re-run smoke tests in the target environment.

### 4) Packaging

- Package obfuscated output with your distribution tool.
- Confirm startup, auth, file IO, and critical business paths on clean machines.

## Review checklist

- [ ] Entry script obfuscated and runs from `dist/`
- [ ] No plaintext secrets in source/config artifacts
- [ ] Release policy chosen (none / expiry / machine binding)
- [ ] Obfuscated build tested on target OS/runtime
- [ ] Packaging validated after obfuscation (not before only)
- [ ] Rollback path documented if protected build fails in production

## Common pitfalls

- **Only testing plain source build**: protected build may fail at runtime.
- **Assuming obfuscation replaces auth/licensing checks**: it does not.
- **Binding too aggressively too early**: can break QA/UAT distribution.
- **No release matrix**: protection can behave differently across OS/arch.

## Additional resources

- Detailed patterns and decision matrix: [reference.md](reference.md)
- Practical command examples: [examples.md](examples.md)

## References

- Pyarmor official site: <http://pyarmor.dashingsoft.com/>
- Pyarmor GitHub repository: <https://github.com/dashingsoft/pyarmor>

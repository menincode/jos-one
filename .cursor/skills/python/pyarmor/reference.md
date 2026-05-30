# Pyarmor Reference

## Capability map

| Need | Pyarmor capability | Notes |
|---|---|---|
| Hide Python implementation | Script obfuscation | Baseline protection for source visibility |
| Time-limited build | Expiration policy | Useful for trials and temporary distributions |
| Device-limited build | Machine binding | Useful for controlled enterprise installs |
| Harder reverse engineering | Irreversible modes (e.g., rename/C-transform modes) | Trade off with compatibility/performance validation |
| Single deliverable flow | Bundle with packager (for example PyInstaller) | Verify protected build after bundling |

## Recommended decision flow

1. Start with baseline obfuscation and runtime verification.
2. Add licensing constraints only if business flow requires them.
3. Enable stronger irreversible protections only after compatibility testing.
4. Package and test on a clean environment matching production.

## Release validation matrix

- Python versions used in production
- OS/architecture combinations
- Entry-point startup path
- Critical API/CLI flows
- Error handling and logging paths
- Installer/update flow

## Security notes

- Obfuscation does not replace API auth, access control, or secure secret storage.
- Keep server-side authorization as source of truth.
- Store licensing decisions and telemetry server-side when possible.
- Avoid embedding high-value long-lived secrets in client builds.

## Suggested artifact outputs

- `docs/security/pyarmor-threat-model.md`
- `docs/security/pyarmor-release-checklist.md`
- `scripts/release/build-obfuscated.sh` (or `.ps1`/`.bat` as needed)
- `scripts/release/verify-obfuscated.sh`

## Upgrade hygiene

- Pin and record Pyarmor version in release notes.
- Read major-version changelogs before upgrading.
- Re-run full validation matrix when protection mode changes.

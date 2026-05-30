# /changelog - Changelog Command

## Purpose

Generate changelog entries from recent commits.

## Usage

```
/changelog [version or 'since:tag']
```

---

Generate changelog for: **$ARGUMENTS**

## Recommended Skills & Agents

- Skill routing source: `.cursor/commands/skill-agent-routing.md` (`/changelog`)
- Preferred skills: `release-and-changelog`, `verification-gate`
- Recommended agent: `generalPurpose`

## Workflow

1. **Analyze Commits**
   ```bash
   git log --oneline --since="last tag"
   ```

2. **Categorize**
   - Added
   - Changed
   - Fixed
   - Removed

3. **Generate**
   - User-friendly descriptions
   - Link to PRs/issues

## Output

```markdown
## [Version] - Date

### Added
- Feature description (#123)

### Changed
- Improvement description (#124)

### Fixed
- Bug fix description (#125)
```

---

## Next Steps & User Guidance

### Immediate Actions

1. **Review the Changelog**
   - [ ] Verify all important changes are included
   - [ ] Check descriptions are clear and user-friendly
   - [ ] Confirm links to PRs/issues are correct
   - [ ] Review categorization is accurate

2. **Next Commands to Use**
   - Use `/commit [message]` to commit changelog updates
   - Use `/ship [message]` to commit and create PR
   - Use `/doc [target]` to update related documentation
   - Use `/deploy [env]` after releasing new version

3. **Update or Improve**
   - To update: Edit changelog directly or regenerate
   - To improve: Add more details or improve descriptions
   - To extend: Update version numbers or add release notes

### Related Commands

| Command | Purpose | When to Use |
|---------|---------|-------------|
| `/commit` | Commit changelog | To save changelog updates |
| `/ship` | Ship changelog | To commit and create PR |
| `/doc` | Update docs | To update related documentation |
| `/deploy` | Deploy release | After creating changelog for release |

### Common Workflows

**Workflow: Changelog → Commit → Ship**
```
/changelog "v1.2.0" → /commit "docs: update changelog" → /ship "chore: release v1.2.0"
```

**Workflow: Changelog → Review → Ship**
```
/changelog "since:v1.1.0" → Review → /ship "docs: changelog"
```

### Tips

- 💡 **Tip**: Generate changelog regularly to keep it up-to-date
- 💡 **Tip**: Use clear, user-friendly descriptions
- 💡 **Tip**: Link to PRs and issues for context
- ⚠️ **Warning**: Don't forget to update changelog for releases
- ⚠️ **Warning**: Ensure all breaking changes are documented

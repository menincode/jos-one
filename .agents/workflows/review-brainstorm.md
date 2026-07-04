---
description: Design Document Review Command
---


## Purpose

Review design documents from brainstorming sessions for completeness, clarity, architecture quality, and implementation readiness. Ensures designs are ready for planning with `/plan`.

**UX/UI Design Review**: When reviewing UX/UI design sections, this command adopts the perspective of a Product Owner with 10 years of experience in UX/UI design and product releases. The focus is on user value, market readiness, accessibility, release strategy, and product-market fit.

## Usage

```
/review-brainstorm [design file path | 'latest']
```

## Arguments

- `$ARGUMENTS`:
  - Design file path: Review specific design file (e.g., `docs/03-design/payment.md`)
  - `latest`: Review the most recently modified design in `docs/03-design/` directory
  - If omitted: Find and review latest design in `docs/03-design/` directory

---

Review design document: **$ARGUMENTS**

## Workflow

### Phase 1: Locate and Load Design

1. **Find Design File**

   - If path provided: Read specified design file
   - If `latest` or no argument: Find most recently modified `.md` file in `docs/03-design/` directory
   - Verify file exists and is readable

2. **Load Design Content**
   - Read entire design document
   - Parse structure (Summary, Architecture, Components, Data Flow, Error Handling, Testing Strategy, UX/UI Design, etc.)
   - Identify design type and scope
   - **Check for UX/UI Design Section**: If present, prepare for comprehensive UX/UI review

### Phase 2: Structure and Completeness Review

1. **Required Sections Check**

   - [ ] Summary present and clear
   - [ ] Architecture described
   - [ ] Components defined
   - [ ] Data flow documented
   - [ ] Error handling considered
   - [ ] Testing strategy included
   - [ ] Open questions listed (if any)
   - **For UX/UI Designs**: [ ] UX/UI Design section present with all sub-sections

2. **Section Quality**
   - Summary: 2-3 sentences, clear overview
   - Architecture: High-level structure is clear
   - Components: Well-defined boundaries
   - Data Flow: Clear movement of data through system

### Phase 3: Architecture Review

1. **Architecture Quality**

   - [ ] Architecture is appropriate for the problem
   - [ ] Components are well-separated
   - [ ] Scalability is considered
   - [ ] Maintainability is addressed

2. **Component Design**

   - [ ] Components have clear responsibilities
   - [ ] Component interfaces are defined
   - [ ] Dependencies between components are clear
   - [ ] No circular dependencies

3. **Technology Choices**
   - [ ] Technologies are appropriate
   - [ ] Trade-offs are explained
   - [ ] Alternatives are considered (if applicable)

### Phase 4: Data Flow Review

1. **Data Flow Clarity**

   - [ ] Data flow is clearly documented
   - [ ] Entry points are identified
   - [ ] Processing steps are clear
   - [ ] Output destinations are defined

2. **Data Transformation**

   - [ ] Data transformations are described
   - [ ] Validation points are identified
   - [ ] Error paths are considered

3. **State Management**
   - [ ] State is clearly defined
   - [ ] State transitions are documented
   - [ ] State persistence is addressed (if applicable)

### Phase 5: Error Handling Review

1. **Error Scenarios**

   - [ ] Common error scenarios are identified
   - [ ] Edge cases are considered
   - [ ] Failure modes are documented

2. **Error Handling Strategy**

   - [ ] Error handling approach is clear
   - [ ] Error recovery is addressed
   - [ ] User experience during errors is considered
   - [ ] Logging/monitoring is planned

3. **Resilience**
   - [ ] System can handle failures gracefully
   - [ ] Retry logic is considered (if applicable)
   - [ ] Timeout handling is addressed

### Phase 6: Testing Strategy Review

1. **Testing Approach**

   - [ ] Testing strategy is defined
   - [ ] Test types are identified (unit, integration, e2e)
   - [ ] Test coverage goals are set

2. **Testability**

   - [ ] Design is testable
   - [ ] Components can be tested in isolation
   - [ ] Mocking strategies are clear

3. **Quality Assurance**
   - [ ] Quality gates are defined
   - [ ] Acceptance criteria are clear
   - [ ] Performance testing is considered (if applicable)

### Phase 7: Implementation Readiness

1. **Clarity for Planning**

   - [ ] Design is clear enough to create implementation plan
   - [ ] Technical decisions are made
   - [ ] Open questions are identified (not blocking)

2. **Completeness**

   - [ ] All major aspects are covered
   - [ ] No obvious gaps in design
   - [ ] Integration points are clear

3. **Actionability**
   - [ ] Design can be translated to tasks
   - [ ] Dependencies are clear
   - [ ] Implementation order is suggested (if applicable)

### Phase 8: Quality and Best Practices

1. **Design Principles**

   - [ ] Follows SOLID principles (where applicable)
   - [ ] DRY is considered
   - [ ] YAGNI is applied (not over-engineered)
   - **For UX/UI**: [ ] User value is prioritized over technical complexity

2. **Documentation Quality**

   - [ ] Language is clear and unambiguous
   - [ ] Diagrams are helpful (if included)
   - [ ] Examples clarify concepts
   - **For UX/UI**: [ ] User journey maps and personas are clear and actionable

3. **Trade-offs**
   - [ ] Trade-offs are explicitly stated
   - [ ] Rationale for decisions is provided
   - [ ] Alternatives are acknowledged
   - **For UX/UI**: [ ] UX/UI trade-offs consider user value and market impact

### Phase 9: UX/UI Design Review (Product Owner Perspective)

**Role**: Act as Product Owner with 10 years of experience in UX/UI design and product releases.

**Focus**: User value, market readiness, accessibility, release strategy, and product-market fit.

#### 9.1: User Research & Personas Review

**Check**:

- [ ] User personas are defined and realistic
- [ ] Personas include demographics, goals, pain points, technical level
- [ ] Primary and secondary personas are identified
- [ ] Personas are based on real user research (not assumptions)
- [ ] Personas align with target market

**Product Owner Perspective**:

- **User Value**: Do personas represent real users who will pay for/use this product?
- **Market Validation**: Are personas validated through research or assumptions?
- **Target Market**: Do personas match the target market for product-market fit?

**Common Issues**:

- Generic personas without real research backing
- Personas that don't represent paying customers
- Missing technical proficiency level (affects UI complexity)
- No differentiation between primary and secondary personas

#### 9.2: User Journey Mapping Review

**Check**:

- [ ] User journey map is complete (Discovery → Onboarding → Usage → Retention)
- [ ] Touchpoints are identified at each stage
- [ ] User emotions and pain points are documented
- [ ] Opportunities for improvement are identified
- [ ] Journey aligns with personas

**Product Owner Perspective**:

- **Conversion Funnel**: Does journey support conversion goals?
- **Friction Points**: Are major friction points identified and addressed?
- **Time-to-Value**: How quickly do users achieve their primary goal?
- **Retention**: Does journey support long-term retention?

**Common Issues**:

- Missing critical stages (e.g., onboarding, retention)
- No identification of pain points or friction
- Journey doesn't align with business goals
- Missing emotional journey (how users feel)

#### 9.3: Information Architecture Review

**Check**:

- [ ] Site/app structure is clearly defined
- [ ] Navigation pattern is appropriate for use case
- [ ] Content hierarchy supports user goals
- [ ] Search and discovery mechanisms are considered
- [ ] Mental model aligns with user expectations

**Product Owner Perspective**:

- **Discoverability**: Can users find what they need without help?
- **Scalability**: Can IA support growth (10x, 100x content/features)?
- **Mobile-First**: Does IA work on mobile devices?
- **Conversion**: Does IA support conversion goals?

**Common Issues**:

- Navigation too complex for target users
- Content hierarchy doesn't prioritize user goals
- Missing search/discovery for power users
- IA doesn't scale with product growth

#### 9.4: UI Design System & Components Review

**Check**:

- [ ] Design system is chosen and rationale provided
- [ ] Design tokens are defined (colors, typography, spacing, shadows)
- [ ] Component library is selected or specified
- [ ] Responsive breakpoints are defined (mobile, tablet, desktop)
- [ ] Accessibility standards are specified (WCAG 2.1 AA minimum)

**Product Owner Perspective**:

- **Consistency**: Will design system ensure consistent UX across features?
- **Development Speed**: Does design system speed up development?
- **Accessibility**: Is accessibility built-in, not bolted on?
- **Brand Alignment**: Does design system support brand identity?

**Common Issues**:

- No design system specified (leads to inconsistency)
- Missing accessibility requirements (legal/compliance risk)
- Responsive design not considered
- Design tokens not defined (implementation delays)

#### 9.5: Interaction Design Review

**Check**:

- [ ] Key interactions are defined (clicks, gestures, keyboard shortcuts)
- [ ] Feedback mechanisms are specified (loading, success, errors)
- [ ] Error handling and recovery are designed
- [ ] Micro-interactions are considered
- [ ] Performance targets are set

**Product Owner Perspective**:

- **User Feedback**: Do users get clear feedback for all actions?
- **Error Recovery**: Can users recover from errors easily?
- **Performance**: Do interactions feel fast and responsive?
- **Delight**: Do micro-interactions enhance UX without slowing down?

**Common Issues**:

- Missing error states and recovery paths
- No performance targets (slow interactions = poor UX)
- Missing loading states (users don't know what's happening)
- No keyboard navigation (accessibility issue)

#### 9.6: Prototyping & Testing Strategy Review

**Check**:

- [ ] Prototype fidelity is specified (low, mid, high)
- [ ] Prototyping tool is chosen
- [ ] Testing methodology is defined (usability, A/B, beta)
- [ ] Test participant criteria are specified
- [ ] Success metrics for testing are defined

**Product Owner Perspective**:

- **Validation Before Build**: Will we test with users before building?
- **Risk Reduction**: Does testing reduce risk of building wrong thing?
- **Cost Efficiency**: Is testing cost-effective (catch issues early)?
- **Data-Driven**: Will decisions be based on user data, not opinions?

**Common Issues**:

- No prototyping plan (build without validation)
- No user testing strategy (assumptions not validated)
- Missing success criteria for testing
- Testing happens too late (after build, expensive to change)

#### 9.7: Product-Market Fit & Release Strategy Review

**Check**:

- [ ] MVP scope is clearly defined (must-have vs. nice-to-have)
- [ ] Release strategy is specified (big bang, phased, beta)
- [ ] Early adopters are identified
- [ ] Go-to-market plan is outlined
- [ ] Success metrics are defined (DAU, retention, conversion, NPS)

**Product Owner Perspective**:

- **MVP Scope**: Is MVP truly minimal but viable?
- **Release Risk**: Does release strategy minimize risk?
- **Market Readiness**: Is product ready for target market?
- **Success Measurement**: Can we measure if product succeeds?
- **Iteration Plan**: Is there a plan to iterate based on data?

**Common Issues**:

- MVP too large (delays launch, increases risk)
- No release strategy (big bang = high risk)
- Missing success metrics (can't measure success)
- No iteration plan (launch and forget)

#### 9.8: Accessibility & Inclusion Review

**Check**:

- [ ] WCAG 2.1 AA compliance is specified (minimum)
- [ ] Keyboard navigation is designed
- [ ] Screen reader support is considered
- [ ] Color contrast meets standards (4.5:1 minimum)
- [ ] Focus indicators are designed

**Product Owner Perspective**:

- **Legal Compliance**: Does design meet accessibility requirements?
- **Market Size**: Are we excluding users unnecessarily?
- **Brand Values**: Does accessibility align with brand values?
- **Cost of Fixing Later**: Is accessibility built-in or added later (expensive)?

**Common Issues**:

- Accessibility not mentioned (legal/compliance risk)
- Color contrast not checked (many users can't see)
- No keyboard navigation (excludes keyboard users)
- Screen readers not considered (excludes blind users)

#### 9.9: Performance & Scalability Review

**Check**:

- [ ] Performance targets are set (FCP, TTI, animation FPS)
- [ ] Performance optimization strategies are considered
- [ ] Scalability is addressed (10x, 100x user growth)
- [ ] Perceived performance is optimized

**Product Owner Perspective**:

- **User Experience**: Do performance targets ensure good UX?
- **Conversion Impact**: Does performance affect conversion (yes, significantly)?
- **Scalability Cost**: Can we scale affordably?
- **Competitive Advantage**: Is performance a differentiator?

**Common Issues**:

- No performance targets (slow = poor UX = low conversion)
- Scalability not considered (expensive to fix later)
- No optimization strategy (slow by default)

#### 9.10: Metrics & Success Criteria Review

**Check**:

- [ ] Primary metrics are defined (acquisition, engagement, retention, conversion)
- [ ] Secondary metrics are identified
- [ ] Success criteria are measurable and testable
- [ ] Post-launch iteration plan is defined

**Product Owner Perspective**:

- **Measurability**: Can we actually measure these metrics?
- **Actionability**: Do metrics inform decisions?
- **Business Alignment**: Do metrics align with business goals?
- **Iteration**: Is there a plan to improve based on metrics?

**Common Issues**:

- Metrics not defined (can't measure success)
- Metrics not measurable (vague, no data source)
- No iteration plan (launch and forget)
- Metrics don't align with business goals

### Phase 10: Save Review (if --save flag provided)

- **Reference**: `.cursor/rules/output-paths.mdc`
- Extract directory from save path (default: `docs/06-reviews/`)
- Ensure directory exists (create if needed, including parent `docs/` if necessary)
- Generate filename if not provided (e.g., `docs/06-reviews/design-payment-review.md`)
- Save review to specified path

## Output Format

```markdown
## Design Review: [Design Name]

**File**: `docs/03-design/[design-name].md`
**Date Reviewed**: [YYYY-MM-DD]
**Verdict**: [Approve | Needs Revision | Request Changes]

---

### Summary

[Brief overview of the design and review findings]

### Strengths

- [What's good about the design]
- [Well-architected components]
- [Clear data flow]

### Issues Found

#### Critical (Must Address)

1. **Missing Error Handling**

   - Payment flow doesn't handle network failures
   - **Impact**: User experience will be poor, potential data loss
   - **Fix**: Add retry logic, error states, and user feedback

2. **Unclear Data Flow**
   - Component interactions are not well-documented
   - **Impact**: Implementation may deviate from design
   - **Fix**: Add sequence diagram or detailed flow description

#### Important (Should Address)

1. **Incomplete Testing Strategy**

   - Only unit tests mentioned, no integration tests
   - **Impact**: Integration issues may be missed
   - **Fix**: Add integration and E2E testing strategy

2. **Missing State Management**
   - State transitions are not documented
   - **Impact**: Implementation may have state bugs
   - **Fix**: Document state machine or state transitions

#### Suggestions (Nice to Have)

1. Consider adding performance considerations for large datasets
2. Include monitoring/observability strategy
3. Add deployment considerations

---

### Completeness Check

- [x] Architecture is described
- [x] Components are defined
- [ ] Data flow is clear
- [ ] Error handling is considered
- [x] Testing strategy is included
- [ ] State management is documented
- [x] Trade-offs are explained

### Architecture Review

**Components**: 5
**Architecture Pattern**: [Microservices | Monolith | Serverless | etc.]
**Quality**: [Good | Needs Improvement]

| Component       | Responsibility     | Issues                    |
| --------------- | ------------------ | ------------------------- |
| Auth Service    | Authentication     | ✅ Clear                  |
| Payment Service | Payment processing | ⚠️ Missing error handling |
| User Service    | User management    | ✅ Clear                  |
| API Gateway     | Request routing    | ⚠️ Unclear data flow      |

### Recommendations

1. **Before Planning**

   - Add error handling for all external dependencies
   - Document data flow with diagrams
   - Complete testing strategy

2. **Improvements**

   - Add state management documentation
   - Include performance considerations
   - Add monitoring strategy

3. **Questions to Resolve**
   - [Question about edge case]
   - [Question about scalability requirements]

---

### Risk Assessment

**Identified Risks**: 2
**High Impact**: 1

| Risk             | Impact | Mitigation          | Status          |
| ---------------- | ------ | ------------------- | --------------- |
| Network failures | High   | Not addressed       | ❌ Missing      |
| Scalability      | Medium | Basic consideration | ⚠️ Needs detail |

---

**Ready for planning**: [Yes | No - Critical issues must be addressed]

### UX/UI Design Review (if UX/UI section present)

#### User Research & Personas

- **Personas Quality**: [Good | Needs Improvement | Missing]
- **Research Validation**: [Based on research | Assumptions only]
- **Market Alignment**: [Aligns with target market | Needs validation]

**Issues**:

- [List any issues with personas or user research]

#### User Journey

- **Journey Completeness**: [Complete | Missing stages]
- **Friction Points**: [Identified | Not addressed]
- **Time-to-Value**: [Fast | Slow | Not considered]

**Issues**:

- [List any issues with user journey]

#### Information Architecture

- **Structure Clarity**: [Clear | Unclear]
- **Navigation Pattern**: [Appropriate | Needs improvement]
- **Scalability**: [Scalable | Not considered]

**Issues**:

- [List any issues with IA]

#### UI Design System

- **Design System**: [Specified | Missing]
- **Accessibility**: [WCAG 2.1 AA | Not specified]
- **Responsive Design**: [Considered | Missing]

**Issues**:

- [List any issues with design system]

#### Product-Market Fit & Release

- **MVP Scope**: [Clear | Too large | Too small]
- **Release Strategy**: [Defined | Missing]
- **Success Metrics**: [Defined | Missing]

**Issues**:

- [List any issues with release strategy]

#### Overall UX/UI Quality

- **User Value**: [Clear | Unclear]
- **Market Readiness**: [Ready | Needs work]
- **Accessibility**: [Compliant | Non-compliant]
- **Release Readiness**: [Ready | Not ready]

**Next Steps**:

1. Address critical issues (especially accessibility and user research)
2. Update design document
3. Re-review if major changes made
4. Proceed with `/plan --detailed` once approved
5. **For UX/UI**: Create prototypes and conduct user testing before implementation
```

## Flags

| Flag             | Description                           | Example                                        |
| ---------------- | ------------------------------------- | ---------------------------------------------- |
| `--mode=[mode]`  | Use specific behavioral mode          | `--mode=review`                                |
| `--depth=[1-5]`  | Review thoroughness level             | `--depth=5`                                    |
| `--format=[fmt]` | Output format (concise/detailed/json) | `--format=detailed`                            |
| `--save=[path]`  | Save review to file                   | `--save=docs/06-reviews/design-payment-review.md` |
| `--focus=[area]` | Focus on specific area                | `--focus=architecture`                         |

### Flag Usage Examples

```bash
/review-brainstorm docs/03-design/payment.md
/review-brainstorm latest
/review-brainstorm --depth=5 docs/03-design/auth.md
/review-brainstorm --save=docs/06-reviews/design-review.md latest
/review-brainstorm --focus=error-handling docs/03-design/payment.md
```

### Focus Areas

| Focus                | Description                                                                           |
| -------------------- | ------------------------------------------------------------------------------------- |
| `architecture`       | Focus on architecture and component design                                            |
| `data-flow`          | Focus on data flow and transformations                                                |
| `error-handling`     | Focus on error scenarios and handling                                                 |
| `testing`            | Focus on testing strategy and testability                                             |
| `completeness`       | Focus on missing sections and information                                             |
| `ux-ui`              | Focus on UX/UI design quality (user research, journey, IA, components, accessibility) |
| `product-market-fit` | Focus on product-market fit, MVP scope, release strategy, success metrics             |
| `accessibility`      | Focus on accessibility compliance (WCAG 2.1 AA) and inclusion                         |
| `user-research`      | Focus on user personas, journey mapping, and validation                               |
| `release-strategy`   | Focus on release strategy, go-to-market, and iteration plan                           |

## MCP Integration

This command leverages MCP servers for enhanced design review:

### Filesystem - Design Discovery

```
For finding and reading design files:
- Use directory_tree to scan docs/03-design/ directory
- Use read_file to load design content
- Use get_file_info to find latest modified design
```

### Sequential Thinking - Structured Analysis

```
For complex design analysis:
- Break down review into logical steps
- Track findings systematically
- Build confidence in assessment incrementally
```

### Memory - Review History

```
Store review findings for continuity:
- Remember previous design reviews
- Track common issues across designs
- Build knowledge of design quality patterns
```

## When to Use

- After brainstorming session to validate design
- Before creating implementation plan with `/plan`
- When reviewing designs from team members
- When checking if design needs updates

## Related Commands

- `/brainstorm` - Create design documents (including UX/UI design)
- `/plan` - Create implementation plans from designs
- `/review-plan` - Review implementation plans
- `/review` - Review UI implementation against design specs

---

## Next Steps & User Guidance

### Immediate Actions

1. **Review the Review**

   - [ ] Address critical UX/UI issues first (accessibility, user research, release strategy)
   - [ ] Review recommendations and suggestions
   - [ ] Check if all issues are valid and actionable
   - [ ] Prioritize fixes by impact (user value, market readiness, legal compliance)
   - **For UX/UI**: [ ] Verify user personas and journey maps are realistic
   - **For UX/UI**: [ ] Confirm accessibility requirements are met (WCAG 2.1 AA)

2. **Next Commands to Use**

   - Use `/brainstorm` to update design with fixes
   - Use `/plan --detailed` to create implementation plan from approved design
   - Use `/execute-plan` to implement the design
   - **For UX/UI**: Create prototypes and conduct user testing before implementation
   - **For UX/UI**: Use `/review` to review UI implementation against design specs

3. **Update or Improve**
   - To update: Fix issues in design document and run `/review-brainstorm` again
   - To improve: Address all recommendations systematically
   - To extend: Add missing UX/UI sections to design document

### Related Commands

| Command              | Purpose                       | When to Use                                 |
| -------------------- | ----------------------------- | ------------------------------------------- |
| `/brainstorm`        | Create or update designs      | After fixing issues found in review         |
| `/plan --detailed`   | Create implementation plan    | After design is approved                    |
| `/execute-plan`      | Execute design implementation | After plan is created and reviewed          |
| `/review-brainstorm` | Review design quality         | After creating design, before planning      |
| `/review`            | Review UI implementation      | After implementation to verify design match |

### Common Workflows

**Workflow: Brainstorm → Review → Fix → Plan**

```
/brainstorm "feature" → /review-brainstorm design.md → Fix issues → /review-brainstorm design.md → /plan --detailed
```

**Workflow: Brainstorm → Review → Prototype → Test → Plan (UX/UI Focus)**

```
/brainstorm "UI feature" → /review-brainstorm design.md → Create prototype → User testing → /plan --detailed
```

**Workflow: Review → Iterate → Review Again**

```
/review-brainstorm design.md → Fix issues → /review-brainstorm design.md → /plan --detailed
```

### Tips

- 💡 **Tip**: Review UX/UI sections with `--focus=ux-ui` for comprehensive UX/UI review
- 💡 **Tip**: Use `--focus=product-market-fit` to review release strategy and success metrics
- 💡 **Tip**: Use `--focus=accessibility` to ensure WCAG 2.1 AA compliance
- 💡 **Tip**: Fix critical UX/UI issues (accessibility, user research) before addressing suggestions
- 💡 **Tip**: For UX/UI designs, always verify user personas are based on real research
- 💡 **Tip**: Ensure release strategy and success metrics are defined before implementation
- ⚠️ **Warning**: Don't skip UX/UI review - it's critical for product success
- ⚠️ **Warning**: Accessibility (WCAG 2.1 AA) is not optional - legal/compliance requirement
- ⚠️ **Warning**: Validate user assumptions with real research before building
- ⚠️ **Warning**: Define success metrics before launch - can't improve what you don't measure

### UX/UI Design Review Best Practices

**Critical Issues to Address First**:

1. **Accessibility**: WCAG 2.1 AA compliance (legal requirement)
2. **User Research**: Personas based on real research, not assumptions
3. **Release Strategy**: MVP scope and go-to-market plan
4. **Success Metrics**: Measurable metrics to track success

**Product Owner Perspective Checklist**:

- [ ] User value is clear for each design decision
- [ ] Market readiness is considered (can we launch this?)
- [ ] Release strategy minimizes risk (phased rollout, beta program)
- [ ] Success metrics are defined and measurable
- [ ] Accessibility is built-in (WCAG 2.1 AA minimum)
- [ ] Performance targets ensure good UX
- [ ] Design system ensures consistency
- [ ] User testing validates assumptions
- [ ] Iteration plan based on data

### File Naming

**Reference**: `.cursor/rules/file-naming-prefix.mdc`

When using `--save` flag without explicit filename:

- Auto-generates: `docs/06-reviews/RV001-[descriptive-name].md`
- Prefix: `RV` (Review)
- Numbers increment sequentially (RV001, RV002, RV003...)

**Example**:

```bash
/review-brainstorm --save docs/03-design/payment.md
# Generates: docs/06-reviews/RV001-payment-design-review.md
```

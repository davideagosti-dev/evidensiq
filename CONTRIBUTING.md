# Contributing to Evidensiq

Thank you for your interest in contributing. Evidensiq is open infrastructure for evidence-backed business context. Contributions that strengthen the specification, TypeScript reference implementation, documentation, and long-term interoperability are welcome.

## Prerequisites

- **Node.js >= 22**
- npm (comes with Node)

```bash
git clone https://github.com/davideagosti-dev/evidensiq.git
cd evidensiq
npm ci
```

## Contributor workflow

From the repository root:

```bash
npm run format:check   # or: npx biome format --write <paths> to apply
npm run lint
npm run typecheck
npm test
npm run build
npm run pack:check
```

Northstar reference demonstration (when relevant):

```bash
npm run demo:northstar
```

Expected Northstar outcome: **14 PASS / 0 FAIL / 0 SKIP**.

## How to propose changes

1. **Check existing issues** to see if your idea is already discussed.
2. **Open an issue** before starting large work — especially specification changes, new primitives, or architectural proposals.
3. **Fork** and create a **one-purpose** feature branch.
4. **Make focused changes** with clear commit messages.
5. **Open a pull request** using the provided template.

For small fixes (typos, broken links, minor clarifications), a pull request without a prior issue is acceptable.

## Phase 1 semantic freeze

Phase 1 normative semantics are **frozen**. Do not change normative behavior or schema without an explicit architecture change gate.

In particular, do not mutate without Product Owner / architecture authorization:

- `specification/business-context.schema.json`
- frozen Northstar fixtures / evaluation oracle
- frozen conformance manifest / L4 expectation artifacts
- L1/L2/L3/L4 normative semantics

If a change would alter Phase 1 meaning: **stop and request an architecture change gate**.

## Specification changes

Changes to `docs/specification/` or `specification/` require **documented rationale**:

- What problem the change addresses
- Why it belongs in Evidensiq (not in an adapter or application layer)
- Impact on provider neutrality
- Whether semantic invariants are affected

Prefer incremental, well-motivated refinements over large unsolicited redesigns.

## Semantic invariants

```
SOURCE ≠ EVIDENCE
EVIDENCE ≠ ASSERTION
ASSERTION ≠ FACT
FACT ≠ INFERENCE
INFERENCE ≠ RECOMMENDATION
```

```
DATA ≠ INSTRUCTION
```

Business data must never be treated as privileged system instructions. Contributions must not blur this boundary.

## Provider neutrality and scope

Evidensiq is **provider-neutral**. Contributions must not:

- Favor a specific LLM provider, agent framework, or cloud platform
- Introduce provider-specific dependencies into the core
- Embed agent orchestration, RAG, embeddings, vector DB, LLM client, or workflow-engine concerns into `@evidensiq/core`

Adapters belong below Evidensiq; agent runtimes belong above it.

## Runtime behavior and docs

- **Tests required** for runtime behavior changes under `src/`
- **Docs required** when public behavior or documented developer workflows change
- Do not expand the public API without Product Owner authorization

## Documentation quality

- Write in clear, professional language
- Avoid marketing fluff, fake maturity claims, and unsupported assertions
- Distinguish **normative** specification from **reference** TypeScript behavior
- Ensure internal links resolve correctly

## Security issues

**Do not report security vulnerabilities through public GitHub issues.**

See [SECURITY.md](SECURITY.md) for responsible disclosure.

## Pull request expectations

Use the pull request template. Ensure you have:

- [ ] Described the problem and scope
- [ ] Assessed specification impact
- [ ] Confirmed semantic invariants are preserved
- [ ] Confirmed provider neutrality is preserved
- [ ] Considered security impact (`DATA ≠ INSTRUCTION`)
- [ ] Updated relevant documentation
- [ ] Added/adjusted tests for runtime behavior changes

## Code of Conduct

All participants are expected to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Questions

Open a GitHub issue with the `question` label, or start a discussion if enabled. Maintainers will respond as capacity allows.

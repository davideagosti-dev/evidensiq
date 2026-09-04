# Roadmap

This roadmap describes planned phases for Evidensiq. Phases are ordered by dependency and maturity — **no delivery dates are promised**.

## Phase 0 — Foundation / Initial Specification

**Status: Complete**

Deliverables:

- [x] Repository foundation (license, governance, contributing, security)
- [x] Initial architecture documentation
- [x] Business Context Specification v0.1 (initial)
- [x] JSON Schema for `business-context.json`
- [x] Terminology and semantic invariants
- [x] Open source and public interest documentation

Phase 0 established the initial semantic contract.

---

## Phase 1 — Specification & Reference Architecture

**Status: Closed**

Goals completed:

- Lock the business context architecture
- Reference business scenario (Northstar)
- Conformance and evaluation model
- Phase 1 architecture gate

Phase 1 normative semantics are **frozen**. Runtime code was not in Phase 1 scope; the TypeScript reference follows in Phase 2.

---

## Phase 2 — TypeScript Reference Implementation

**Status: TypeScript reference implementation implemented through EVI-2.6; EVI-2.7 public-reference readiness currently being completed.**

Phase 2 is **not** marked formally closed until Product Owner closure.

Goals (implemented through EVI-2.6):

- Reference implementation of the deterministic core in TypeScript (`@evidensiq/core`)
- Schema validation for `business-context.json`
- L1–L4 conformance support
- Entity, relationship, and provenance management
- Temporal validity and conflict representation
- Confidence model implementation (within frozen scope)
- Context projection API
- Recommendation assessment pipeline
- Serialization and deserialization
- Northstar evaluation harness (repository tooling; not public package API)

EVI-2.7 focuses on public developer discoverability and reproducibility (documentation, quickstart, CI) **without** npm publish, version bump, or API expansion.

Non-goals (unchanged):

- LLM integration
- Agent orchestration
- Vector search

Package remains `@evidensiq/core@0.0.0` until a separately authorized release action.

---

## Phase 3 — .NET Reference Implementation

**Status: Not started**

Goals (intent only; not started):

- Reference implementation of the deterministic core in .NET
- Parity with TypeScript reference core capabilities
- Shared conformance test suite
- NuGet package publication (when ready)

Rationale: Enterprise adoption requires first-class .NET support alongside TypeScript.

After successful EVI-2.7 formal closure, Product Owner intends to run **EVI-FUND-0.1 — Open Source Europe Application Readiness Gate** before Phase 3. That gate is not part of this implementation sprint.

---

## Phase 4 — Integrations / Adapters

**Status: Planned**

Goals:

- Document ingestion adapters (CSV, Markdown, PDF)
- CRM and ERP connector patterns
- LLM adapter interface (provider-neutral)
- Storage adapter interface
- Vector search adapter interface (Evidensiq does not own vector search)

Adapters sit **below** Evidensiq. Each adapter is independently versioned and maintained.

---

## Phase 5 — Public Alpha / Ecosystem Validation

**Status: Planned**

Goals:

- Integration guides for major agent frameworks
- Community adapter registry
- Specification versioning and migration tooling
- Expanded reference scenarios
- Potential working groups for domain-specific extensions
- Public alpha release and ecosystem validation

---

## Principles Across All Phases

1. **Semantic invariants are preserved** — SOURCE ≠ EVIDENCE ≠ ASSERTION ≠ FACT ≠ INFERENCE ≠ RECOMMENDATION
2. **Provider neutrality** — no lock-in to specific AI providers or platforms
3. **Deterministic core first** — AI-assisted capabilities are candidates subject to validation
4. **Portable format** — `business-context.json` remains the interoperability bridge
5. **Open development** — all phases proceed through public issues, PRs, and documented decisions
6. **DATA ≠ INSTRUCTION** — business content never acquires instructional authority

## How to Influence the Roadmap

- Open a GitHub issue with the `roadmap` label
- Propose specification changes with documented rationale
- Contribute to specification documentation and review

See [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.

## Related Documents

- [Architecture](architecture/architecture.md)
- [Business Context Specification](specification/business-context-spec.md)
- [Conformance](specification/conformance.md)
- [TypeScript Quickstart](reference/typescript-quickstart.md)
- [Funding](funding.md)

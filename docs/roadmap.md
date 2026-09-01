# Roadmap

This roadmap describes planned phases for Evidensiq. Phases are ordered by dependency and maturity — **no delivery dates are promised**.

## Current Phase: Phase 0 — Foundation and Specification

**Status: In progress**

Deliverables:

- [x] Repository foundation (license, governance, contributing, security)
- [x] Architecture documentation
- [x] Business Context Specification v0.1
- [x] JSON Schema for `business-context.json`
- [x] Terminology and semantic invariants
- [x] Open source and public interest documentation
- [ ] Community feedback on specification

Phase 0 establishes the semantic contract. No runtime code is included.

---

## Phase 1 — TypeScript Reference Core

**Status: Planned**

Goals:

- Reference implementation of the deterministic core in TypeScript
- Schema validation for `business-context.json`
- Entity, relationship, and provenance management
- Temporal validity and conflict representation
- Confidence model implementation
- Context projection API
- Recommendation pipeline (validation and status tracking)
- Serialization and deserialization

Non-goals:

- LLM integration
- Agent orchestration
- Vector search

---

## Phase 2 — .NET Reference Core

**Status: Planned**

Goals:

- Reference implementation of the deterministic core in .NET
- Parity with TypeScript reference core capabilities
- Shared conformance test suite
- NuGet package publication (when ready)

Rationale: Enterprise adoption requires first-class .NET support alongside TypeScript.

---

## Phase 3 — Evaluation and Conformance

**Status: Planned**

Goals:

- Conformance test suite for specification compliance
- Evaluation methodology for:
  - Evidence coverage
  - Contradiction rate
  - Unsupported assertion rate
  - Constraint violation rate
  - Stale evidence rate
  - Recommendation stability
- Counterfactual evaluation tooling
- Reference scenario benchmarks (e.g., Northstar Manufacturing)

---

## Phase 4 — Runtime Adapters

**Status: Planned**

Goals:

- Document ingestion adapters (CSV, Markdown, PDF)
- CRM and ERP connector patterns
- LLM adapter interface (provider-neutral)
- Storage adapter interface
- Vector search adapter interface (Evidensiq does not own vector search)

Adapters sit **below** Evidensiq. Each adapter is independently versioned and maintained.

---

## Phase 5 — Ecosystem and Interoperability

**Status: Planned**

Goals:

- Integration guides for major agent frameworks
- Community adapter registry
- Specification versioning and migration tooling
- Expanded reference scenarios
- Potential working groups for domain-specific extensions

---

## Principles Across All Phases

1. **Semantic invariants are preserved** — SOURCE ≠ EVIDENCE ≠ FACT ≠ INFERENCE ≠ RECOMMENDATION
2. **Provider neutrality** — no lock-in to specific AI providers or platforms
3. **Deterministic core first** — AI-assisted capabilities are candidates subject to validation
4. **Portable format** — `business-context.json` remains the interoperability bridge
5. **Open development** — all phases proceed through public issues, PRs, and documented decisions

## How to Influence the Roadmap

- Open a GitHub issue with the `roadmap` label
- Propose specification changes with documented rationale
- Contribute to Phase 0 documentation and review

See [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.

## Related Documents

- [Architecture](architecture/architecture.md)
- [Business Context Specification](specification/business-context-spec.md)
- [Funding](funding.md)

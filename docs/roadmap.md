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

Phase 0 established the initial semantic contract. No runtime code is included.

---

## Phase 1 — Specification & Reference Architecture

**Status: In progress**

Goals:

- Lock the business context architecture
- Reference business scenario
- Conformance and evaluation model
- Phase 1 architecture gate

### Deliverables

| Item | Description | Status |
|------|-------------|--------|
| **EVI-1.1** | Specification Review & Architecture Lock | In progress |
| **EVI-1.2** | Reference Business Scenario | Planned |
| **EVI-1.3** | Conformance & Evaluation Model | Planned |
| **EVI-1.4** | Phase 1 Architecture Gate | Planned |

EVI-1.1 delivers:

- Assertion/Fact model correction
- Temporal and conflict semantics
- Provenance/trust model
- Confidence model
- Recommendation assessment
- Context projection contract
- Conformance model (L1–L4)
- Serialization and versioning rules
- Roadmap alignment

No runtime code in Phase 1.

---

## Phase 2 — TypeScript Reference Implementation

**Status: Planned**

Goals:

- Reference implementation of the deterministic core in TypeScript
- Schema validation for `business-context.json`
- L1–L4 conformance support
- Entity, relationship, and provenance management
- Temporal validity and conflict representation
- Confidence model implementation
- Context projection API
- Recommendation assessment pipeline
- Serialization and deserialization

Non-goals:

- LLM integration
- Agent orchestration
- Vector search

---

## Phase 3 — .NET Reference Implementation

**Status: Planned**

Goals:

- Reference implementation of the deterministic core in .NET
- Parity with TypeScript reference core capabilities
- Shared conformance test suite
- NuGet package publication (when ready)

Rationale: Enterprise adoption requires first-class .NET support alongside TypeScript.

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

## How to Influence the Roadmap

- Open a GitHub issue with the `roadmap` label
- Propose specification changes with documented rationale
- Contribute to specification documentation and review

See [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.

## Related Documents

- [Architecture](architecture/architecture.md)
- [Business Context Specification](specification/business-context-spec.md)
- [Conformance](specification/conformance.md)
- [Funding](funding.md)

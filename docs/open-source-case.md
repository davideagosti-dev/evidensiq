# The Case for Open Business Context Infrastructure

We are building open interoperability infrastructure for trustworthy business reasoning by AI systems.

This document explains why Evidensiq exists, why it should be open source, and how it relates to the broader AI agent ecosystem.

## The Problem: Business Context Is Fragmented

Organizations accumulate business knowledge across dozens of systems:

- CRM platforms
- ERP and operational tools
- Spreadsheets and exports
- Strategy documents and meeting notes
- Support tickets and communications
- Websites and marketing materials
- Ad-hoc databases and internal wikis

When AI systems need this context, developers typically:

1. **Concatenate documents into prompts** — fragile, untraceable, and unbounded in size
2. **Build custom RAG pipelines** — retrieval without semantic structure, provenance, or conflict awareness
3. **Use vendor-specific memory systems** — locking organizational knowledge into a single provider's abstraction
4. **Embed context in agent framework state** — non-portable, framework-coupled, difficult to audit

None of these approaches treat business context as **infrastructure**.

## Why Prompt Text Is Not a Reliable Infrastructure Boundary

Prompts are a transport mechanism, not a semantic contract.

When business context lives in prompt text:

- **Provenance is lost** — you cannot trace why the model "knows" something
- **Conflicts are hidden** — contradictory data is silently merged or arbitrarily selected
- **Temporal validity is ignored** — outdated facts appear alongside current ones
- **Recommendations are untraceable** — no link from output back to evidence
- **Prompt injection is trivial** — business documents may contain instruction-like text
- **Context is not portable** — moving to a different provider means rebuilding everything

Evidensiq's working thesis: **Business context should be infrastructure, not prompt text.**

## Risks of Vendor-Specific Memory and Context Systems

Proprietary memory layers and context systems offered by AI providers and agent frameworks solve immediate integration problems but create long-term risks:

| Risk | Description |
|------|-------------|
| **Vendor lock-in** | Organizational knowledge becomes trapped in provider-specific formats |
| **Opacity** | Internal representation is not inspectable or auditable |
| **Non-portability** | Context cannot move between providers, frameworks, or deployments |
| **Semantic ambiguity** | No shared contract for what "evidence" or "recommendation" means |
| **Trust assumptions** | Model outputs treated as facts without provenance or validation |

Evidensiq does not replace these systems. It defines an open layer beneath them — a portable semantic contract that any runtime can consume.

## Why Portable Provenance Matters

Business decisions depend on knowing **where information came from** and **when it was true**.

A product price from a 2025 PDF, a CRM field, and a live website may all differ. A reasoning system that silently picks one is not trustworthy. Evidensiq represents:

- Conflicting values with source references
- Observation timestamps
- Freshness indicators
- Unresolved conflict status

Provenance is not metadata decoration — it is a prerequisite for auditable AI reasoning over business data.

## Why Inference and Recommendation Traceability Matters

When an AI system recommends "do not increase acquisition spend," stakeholders need to ask:

- What evidence supports this?
- What constraints were considered?
- What signals were detected?
- What inferences were drawn?
- What happens if key evidence is removed?

Evidensiq enforces a semantic chain:

```
SOURCE → EVIDENCE → FACT → INFERENCE → RECOMMENDATION
```

Each layer is distinct. The LLM is never the source of truth. Recommendations carry status, rationale, and evidence references.

## Why TypeScript and .NET Interoperability Matters

Enterprise software spans ecosystems. A specification that only serves one language ecosystem limits adoption and interoperability.

Evidensiq aims to support reference implementations in both **TypeScript** (web, Node.js, modern tooling) and **.NET** (enterprise, Azure, existing business systems) — with a shared portable format (`business-context.json`) as the interoperability bridge.

This is not about language preference. It is about meeting organizations where their systems already live.

## Why This Belongs in Open Source

Business context infrastructure serves a public interest function:

1. **Interoperability** — Organizations should not be locked into a single AI provider's context model
2. **Auditability** — Open specifications enable inspection, critique, and improvement
3. **Trust** — Transparent semantic invariants (SOURCE ≠ EVIDENCE ≠ FACT) build confidence in AI reasoning
4. **Innovation** — Open infrastructure enables adapters, tools, and integrations from any contributor
5. **Neutrality** — A provider-neutral specification cannot be captured by a single vendor's roadmap

Closed, proprietary context layers optimize for vendor retention. Open infrastructure optimizes for organizational sovereignty over business knowledge.

## How Evidensiq Complements Agent Frameworks

Evidensiq is **not** an agent framework. It does not:

- Orchestrate multi-agent workflows
- Manage conversation state
- Provide tool-calling infrastructure
- Replace LangChain, Semantic Kernel, or similar frameworks

Instead, Evidensiq sits **below** the agent runtime:

```
Your Agent Framework / Application
              ↓
         EVIDENSIQ (business context contract)
              ↓
    Adapters (LLM, CRM, storage, documents)
```

Agent frameworks handle *how* agents run. Evidensiq handles *what business context they reason over* — structured, temporal, traceable, and portable.

This complementarity is intentional. Evidensiq strengthens any agent framework by providing a rigorous business context layer; agent frameworks provide the runtime Evidensiq deliberately does not own.

## What Success Looks Like

Evidensiq succeeds if:

- Developers can export and import structured business context across runtimes
- Recommendations are traceable to evidence through a documented semantic chain
- Conflicts are visible, not silently resolved
- Business data is treated as evidence, never as system instructions
- Multiple adapter ecosystems emerge without fragmenting the core specification

Evidensiq does not need to be the only solution. It needs to be a **credible, open, provider-neutral foundation** that the industry can build on.

## Related Documents

- [Public Interest Rationale](public-interest.md)
- [Funding](funding.md)
- [Architecture](architecture/architecture.md)
- [Roadmap](roadmap.md)

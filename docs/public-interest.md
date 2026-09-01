# Public Interest Rationale

Evidensiq is designed to serve a public interest function: enabling trustworthy, portable, evidence-backed business reasoning by AI systems through open infrastructure.

## The Public Interest Problem

AI agents increasingly depend on:

- Proprietary application context locked inside vendor platforms
- Closed orchestration layers with opaque internal representations
- Vendor-specific memory systems that do not export structured business knowledge
- Prompt-based context injection that is untraceable and non-auditable

This creates a structural problem: **organizational business knowledge becomes captive to specific AI providers and frameworks**, reducing interoperability, auditability, and long-term organizational control.

## What Open Infrastructure Provides

Evidensiq aims to define an open, portable representation for:

| Concern | Open Representation |
|---------|---------------------|
| Business evidence | Structured evidence objects with provenance |
| Provenance | Source identity, trust classification, observation time |
| Facts and assertions | Temporal, evidence-linked claims |
| Constraints | Explicit limiting conditions |
| Conflicts | Preserved contradictions with references |
| Inference | Derived conclusions with traceable inputs |
| Recommendations | Validated, status-tracked proposals with rationale |

Developers should be able to **move structured business context between runtimes** instead of rebuilding it for each provider or framework.

## Why Open Source Matters Here

Business context is not a competitive feature of a single product — it is **shared infrastructure** that many systems need.

Open sourcing this specification:

- Prevents capture by a single vendor's roadmap
- Enables independent audit and critique of semantic invariants
- Allows community contribution to adapters and tooling
- Supports organizations that require inspectable AI reasoning chains
- Aligns with principles of digital sovereignty and data portability

## Positioning Statement

**We are building open interoperability infrastructure for trustworthy business reasoning by AI systems.**

Evidensiq is **not** positioned as "an AI assistant for businesses." It is infrastructure — a semantic contract and portable format that applications and agent runtimes can embed.

## Semantic Safety as Public Interest

The invariant **DATA ≠ INSTRUCTION** is a public interest concern. Business documents used as AI context may contain accidental or malicious instruction-like text. Treating business data as evidence rather than privileged instructions protects against a class of prompt injection attacks that affect any organization using AI over business content.

Open documentation of this boundary enables adopters to implement defenses consistently.

## Interoperability as Public Interest

When business context is portable:

- Organizations can evaluate AI providers without rebuilding context layers
- Regulators and auditors can inspect reasoning chains
- Small teams can adopt the same infrastructure as enterprises
- Community adapters benefit all adopters, not a single vendor

## Relationship to Existing Work

Evidensiq does not claim to be unprecedented. Schema.org, FHIR, and other open specifications demonstrate that shared semantic contracts enable ecosystem growth. Evidensiq applies similar principles to the domain of business context for AI reasoning — a space that currently lacks an open, provider-neutral specification.

## Governance and Transparency

Project governance is maintainer-led and transparent. Major decisions are documented publicly. The specification is the primary artifact, and changes require rationale and review.

See [GOVERNANCE.md](../GOVERNANCE.md) for details.

## Related Documents

- [Open Source Case](open-source-case.md)
- [Funding](funding.md)
- [Contributing](../CONTRIBUTING.md)

# Governance

Evidensiq is an early-stage open-source project. This document describes how the project is governed today and how governance may evolve as the community grows.

## Current Model: Maintainer-Led

At this stage, the project is **maintainer-led**. A small set of maintainers guide direction, review contributions, and steward the specification. This is intentional for an early specification project where architectural coherence matters.

Maintainers are responsible for:

- Setting project direction in alignment with the stated mission
- Reviewing pull requests and specification changes
- Documenting major architectural decisions
- Ensuring semantic invariants and provider neutrality are preserved
- Facilitating transparent discussion through public issues and pull requests

## Decision-Making

Decisions are made **transparently**:

- **Routine changes** (documentation fixes, clarifications, non-breaking spec refinements) are reviewed through normal pull request process.
- **Major architectural decisions** (new primitives, breaking specification changes, boundary shifts) require documented rationale in the pull request and, where appropriate, a dedicated issue for community input before merge.
- **Specification changes** receive careful review. The business context specification is the core contract of this project; changes must not be made casually.

Maintainers aim to explain *why* a decision was made, not only *what* changed.

## Community Participation

Contributors are welcome and valued. Participation includes:

- Reporting issues
- Proposing improvements
- Submitting documentation and specification refinements
- Participating in design discussions

**Contribution does not automatically imply maintainer status.** Maintainer responsibilities require sustained engagement, alignment with project principles, and trust earned through quality contributions over time.

## Communication Channels

- **GitHub Issues** — bug reports, feature proposals, design questions
- **GitHub Pull Requests** — all code and documentation changes
- **GitHub Discussions** — may be enabled as the project grows

All substantive project decisions should be traceable through public GitHub history.

## Specification Stewardship

The Evidensiq specification (`docs/specification/`, `specification/`) is the primary artifact of this project. Governance principles for the spec:

1. Semantic invariants (SOURCE ≠ EVIDENCE ≠ FACT ≠ INFERENCE ≠ RECOMMENDATION) must not be weakened without explicit, documented justification.
2. Provider neutrality must be preserved; the specification must not favor a specific AI provider, agent framework, or cloud platform.
3. Breaking changes require a version bump and migration notes.
4. Early specification (v0.1) is explicitly extensible; perfection is not required, but clarity and consistency are.

## Evolution

As the project matures and the contributor base grows, governance may evolve to include:

- A formal maintainer team with documented criteria for joining
- RFC (Request for Comments) process for significant changes
- Advisory input from downstream adopters and adapter authors
- Community-elected or consensus-based decision mechanisms

Any governance change will itself be proposed transparently and documented in this file.

## No Pretense of Scale

This project does not claim a large existing contributor community. Governance is designed for the current early stage and will adapt as adoption and participation increase.

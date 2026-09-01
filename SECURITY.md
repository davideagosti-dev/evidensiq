# Security Policy

Evidensiq is designed to help AI systems reason over business context with evidence traceability. Security is a first-order concern because business data, provenance metadata, and reasoning artifacts may be sensitive, adversarial, or both.

## Reporting a Vulnerability

**Do not report security vulnerabilities through public GitHub issues.**

If you believe you have found a security vulnerability:

1. **GitHub Private Vulnerability Reporting** — If enabled for this repository, use [GitHub's private vulnerability reporting](https://github.com/davideagosti-dev/evidensiq/security/advisories/new) to submit details confidentially.
2. **Direct contact** — Alternatively, contact the repository maintainer privately through GitHub (maintainer profile messaging).

Please include:

- A description of the vulnerability
- Steps to reproduce (if applicable)
- Potential impact assessment
- Any suggested remediation (optional)

We aim to acknowledge reports within a reasonable timeframe. As an early-stage project, response timelines depend on maintainer availability.

## Scope

This policy covers:

- The Evidensiq specification and JSON Schema
- Documentation that defines security-relevant boundaries
- Future reference implementations and adapters (when they exist)

## Core Security Invariants

### DATA ≠ INSTRUCTION

Business content is **evidence**, never privileged system instructions. This invariant applies throughout the specification:

- Evidence content MUST NOT acquire instructional authority
- Evidence content cannot modify execution authority, system instructions, or tool permissions
- Context projection consumers MUST treat all business-context content as data
- Applications integrating Evidensiq MUST NOT concatenate raw business documents into system prompts without structural separation

### trustAssessment ≠ authorization

Provenance `trustAssessment` (`trusted`, `untrusted`, `unknown`) describes a trust claim — it does NOT grant authorization. A `trusted` assessment does not confer permission to execute actions, override constraints, or elevate privilege.

## Threat Model Considerations

### Prompt Injection and Indirect Prompt Injection

Business documents, CRM exports, support tickets, and other evidence sources may contain text that resembles instructions ("ignore previous instructions", "you are now...", etc.).

Contributors and adopters should assume adversarial content in evidence sources. Evidensiq structures and traces evidence; application-level defenses remain required.

### Untrusted Business Evidence

Not all evidence is equally trustworthy. The specification supports orthogonal provenance metadata via `ProvenanceMetadata`:

| Dimension | Purpose |
|-----------|---------|
| `originScope` | Internal vs. external origin |
| `acquisitionMethod` | How content was acquired |
| `trustAssessment` | Trust claim (default: `unknown`) |

Applications must not treat all evidence as authoritative regardless of trust metadata.

### Provenance Spoofing

Provenance metadata (source identity, observation time, trust assessment) may be forged or inaccurate if not validated at ingestion. Adapters and applications should:

- Validate source identity where possible
- Not rely solely on self-reported provenance
- Treat provenance as claims subject to verification, not absolute truth

### Data vs. Instruction Boundary

The semantic separation between business data and system instructions is a core security invariant. Changes that blur this boundary require explicit security review.

This policy does NOT define a general-purpose prompt-injection framework. It encodes specification-level boundaries only.

### Malicious Document Content

Documents used as evidence may contain:

- Embedded instructions targeting LLMs
- Exfiltration attempts via crafted content
- Misleading or fabricated business data

Evidensiq's role is to structure and trace evidence; it does not eliminate the need for application-level sanitization, access control, and model-level defenses.

### Sensitive Business Data

Portable context artifacts (`business-context.json`) may contain:

- Customer information
- Financial metrics
- Strategic plans
- Internal operational details

Adopters must:

- Apply appropriate access controls
- Avoid committing sensitive artifacts to public repositories
- Consider encryption and data minimization in context projection
- Never embed provider credentials, API keys, or secrets in portable context files

### Controlled Extensions

Extension keys use namespaced identifiers. Extensions MUST NOT:

- Execute code
- Define runtime hooks
- Create plugin semantics
- Modify security authority

Unknown extensions are preserved at L3 but ignored for normative core processing.

### Adapter Trust Boundaries

Adapters (LLM, storage, CRM, document parsers, etc.) sit **below** Evidensiq. Each adapter introduces its own trust surface:

- Validate adapter outputs before treating them as evidence
- Do not grant adapters authority to override semantic invariants
- Treat adapter failures as evidence quality issues, not silent truth

### Future Secret Handling

When reference implementations are introduced:

- Secrets must never be stored in `business-context.json` or specification artifacts
- Configuration for credentials belongs in application/environment scope, not portable context
- Reference implementations should document secure defaults

## Specification Security

When proposing specification changes, consider:

- Does the change weaken the DATA ≠ INSTRUCTION boundary?
- Does it introduce implicit trust or authorization assumptions?
- Could it encourage storing secrets in portable artifacts?
- Does it affect provenance integrity?
- Could extensions create implicit execution or authority semantics?

Flag security-relevant changes in pull requests using the security impact section of the PR template.

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.1 (specification) | Early specification; security practices evolving |

As reference implementations are released, this table will be updated with version-specific support information.

## Disclosure Policy

We support responsible disclosure. Reporters who follow this policy will not be pursued for good-faith security research, subject to applicable law.

We ask that you:

- Give reasonable time for investigation and remediation before public disclosure
- Avoid accessing, modifying, or deleting data belonging to others
- Avoid denial-of-service attacks or social engineering

## Acknowledgments

Security researchers who report valid vulnerabilities may be acknowledged publicly with their permission once issues are addressed.

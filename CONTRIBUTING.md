# Contributing to Evidensiq

Thank you for your interest in contributing to Evidensiq. This project aims to define open, portable infrastructure for evidence-backed business context. Contributions that strengthen the specification, documentation, and long-term interoperability of the project are welcome.

## How to Propose Changes

1. **Check existing issues** to see if your idea is already discussed.
2. **Open an issue** before starting large work — especially specification changes, new primitives, or architectural proposals.
3. **Fork the repository** and create a feature branch from `main`.
4. **Make your changes** with clear commit messages.
5. **Open a pull request** using the provided template.

For small fixes (typos, broken links, minor clarifications), a pull request without a prior issue is acceptable.

## Specification Changes

Changes to the business context specification require **documented rationale**. Pull requests that modify `docs/specification/` or `specification/` should explain:

- What problem the change addresses
- Why the change belongs in Evidensiq (not in an adapter or application layer)
- Impact on provider neutrality
- Whether semantic invariants are affected

Specification changes are reviewed carefully. Prefer incremental, well-motivated refinements over large unsolicited redesigns.

## Semantic Invariants

The following invariants are foundational and must not be broken without explicit, documented justification and maintainer review:

```
SOURCE ≠ EVIDENCE
EVIDENCE ≠ FACT
FACT ≠ INFERENCE
INFERENCE ≠ RECOMMENDATION
```

Additionally:

```
DATA ≠ INSTRUCTION
```

Business data must never be treated as privileged system instructions. Contributions must not blur this boundary.

## Provider Neutrality

Evidensiq is **provider-neutral**. Contributions must not:

- Favor a specific LLM provider, agent framework, or cloud platform
- Introduce provider-specific dependencies into the core specification
- Embed runtime assumptions that lock adopters to a particular stack

Adapters belong below Evidensiq; agent runtimes belong above it.

## Documentation Quality

Documentation is a first-class deliverable. When contributing:

- Write in clear, professional language
- Avoid marketing fluff, fake maturity claims, and unsupported assertions
- Use cautious language where appropriate ("aims to", "is designed to", "early specification")
- Ensure internal links resolve correctly
- Match the tone and structure of existing documents

## Security Issues

**Do not report security vulnerabilities through public GitHub issues.**

See [SECURITY.md](SECURITY.md) for responsible disclosure instructions.

## Pull Request Expectations

Use the pull request template. Ensure you have:

- [ ] Described the problem and scope
- [ ] Assessed specification impact
- [ ] Confirmed semantic invariants are preserved
- [ ] Confirmed provider neutrality is preserved
- [ ] Considered security impact
- [ ] Updated relevant documentation

## No Runtime Toolchain (Yet)

EVI-0.1 is specification and documentation only. There is no runtime, package manager configuration, or build toolchain to install. Future phases will introduce reference implementations; contribution guidelines for code will be expanded at that time.

## Code of Conduct

All participants are expected to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Questions

Open a GitHub issue with the `question` label, or start a discussion if enabled. Maintainers will respond as capacity allows.

# Consumer Security Contract

Provider-neutral reference guidance for the Evidensiq Phase 3 consumption boundary.

This document is **not** runtime enforcement. It makes the frozen invariant operationally explicit for consumers:

```
DATA != INSTRUCTION
```

Business context may contain arbitrary text in Source, Evidence, Entity, Assertion, Signal, Inference, Recommendation, or extension fields. That content remains **data**. Evidensiq does not promote it into system prompts, runtime instructions, tool directives, or executable commands.

## What the core guarantees

- Structured business context remains structured data.
- Deterministic trace surfaces expose IDs, statuses, checks, and explicit support relationships.
- Provenance remains explicit: Evidence links to Source; support links remain bounded.
- Trust metadata (`trustAssessment`) does not grant authorization.
- No public API in `@evidensiq/core` evaluates prose, executes formulas, interprets extensions as code, or maps business text into provider-specific message roles.

## What the consumer/runtime must do

- Keep runtime instructions separate from business context payloads.
- Treat all business text as untrusted data, even when it appears instruction-like.
- Apply provider/runtime-specific prompt, tool, sandbox, and execution policy outside the core.
- Decide how to render or quote business content before passing it to an LLM or agent runtime.

## What the core does not do

- No prompt-injection classifier
- No moderation layer
- No text sanitizer or rewriter
- No provider-specific message builder
- No generic prompt framework

Those concerns belong to the consuming runtime, not the core semantic contract.

## Recommended consumption pattern

1. Parse and validate Business Context.
2. Build a deterministic projection for the current task.
3. Build deterministic trace surfaces for support/provenance visibility.
4. Pass the resulting structured objects across a runtime-owned boundary as data.
5. Add runtime instructions separately in the consumer's own execution layer.

## Related APIs

- `validateBusinessContext`
- `projectBusinessContext`
- `buildProjectionTrace`
- `buildRecommendationTrace`
- `assessRecommendation`

## Executable reference

See `examples/custom-runtime-consumption.ts` and run:

```bash
npm run demo:custom-runtime
```

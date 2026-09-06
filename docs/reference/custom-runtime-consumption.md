# Custom Runtime Consumption

Provider-neutral executable reference for consuming Evidensiq structured context from an external runtime.

This example is intentionally **not** an agent framework, workflow engine, prompt framework, tool loop, or provider adapter. It demonstrates one bounded path:

`BusinessContext -> validate -> project -> provenance closure -> deterministic trace -> runtime boundary`

## Run

From the repository root:

```bash
npm ci
npm run demo:custom-runtime
```

Expected outcome: deterministic JSON showing the projection, structured trace surfaces, and the runtime boundary envelope.

## What it demonstrates

- Load and parse the canonical Northstar Business Context fixture
- Validate with public APIs
- Project a relevant subset with `projectBusinessContext`
- Preserve Evidence -> Source closure already guaranteed by projection
- Build structured deterministic trace surfaces with:
  - `buildProjectionTrace`
  - `buildRecommendationTrace`
- Keep `DATA != INSTRUCTION` explicit at the runtime boundary
- Hand only structured data to a provider-neutral custom runtime object

## Ownership boundary

Evidensiq owns:

- validation
- projection
- provenance closure
- deterministic trace surfaces

The runtime owns:

- task framing
- system instructions
- provider/model selection
- tool execution policy
- safe rendering/presentation of business text

## Important non-goals

- No OpenAI, Anthropic, Microsoft, LangChain, or other provider SDK
- No conversation history
- No autonomous tool execution
- No planning engine
- No generic memory
- No prompt builder

## Why the example is structured this way

The example deliberately passes a `contextData` object and a separate `boundary` object into a runtime-owned handoff function. This preserves the Phase 3 invariant that business content is data, not runtime authority.

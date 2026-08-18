# Hardening Milestone: Validation Findings Mapping (`FINDINGS.md`)

This document maps all six validation findings from the v0.18.0 platform audit to their reproduction test fixtures, implementation changes, and verification gates.

---

## Findings Matrix

| Finding ID | Priority | Category | Problem Summary | Reproduction Fixture | Core Fix Target | Verification Gate |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **F-001** | **P0** | Security / Correctness | Unspaced operators (e.g. `status>=published`) fail tokenization and silently produce an empty AST which compiles to `1=1` (unrestricted access). | `evals/security/query_security_invariants.eval.ts` | `src/tools/search/filter.ts` | Zero silent query broadening invariant; malformed queries throw `QueryParseError`. |
| **F-002** | **P0** | Security / Correctness | `IN` list syntax `id in ("a", "b")` parses value as `"("` instead of string list `["a", "b"]`. Empty `IN` handling undefined. | `evals/query/query_in_list.eval.ts` | `src/tools/search/filter.ts`, `src/tools/search/query-builder.ts` | Explicit list grammar in parser; compilation to `IN (?, ?, ...)`; empty AST safeguard `1=0`. |
| **F-003** | **P1** | Platform Architecture | Native Cloudflare D1 driver missing; requiring consumer-written adapter. Capabilities assumed rather than verified. | `evals/database/d1_adapter.eval.ts` | `src/tools/database/d1/d1_driver.ts`, `src/tools/database/factory.ts` | First-class `D1DatabaseDriver` implementing `DatabaseDriver` with verified capability descriptor. |
| **F-004** | **P1** | Query Contract | Sort syntax `created_at DESC` fails identifier validation because parser only accepts `-field` prefix. | `evals/query/relational_and_sort.eval.ts` | `src/tools/search/query-builder.ts` | Sort normalization supporting `-field`, `+field`, `field ASC`, `field DESC`, and comma-separated lists. |
| **F-005** | **P1** | Platform Architecture | In-memory `Broker` tightly couples process-local EventEmitter with WebSocket/SSE transport, preventing distributed Edge pub/sub. | `evals/realtime/realtime_provider.eval.ts` | `src/tools/subscriptions/provider.ts`, `src/tools/subscriptions/broker.ts` | `RealtimeProvider` interface with `InMemoryRealtimeProvider` default; transport lifecycle decoupled. |
| **F-006** | **P1** | Query Contract | Relational / dotted fields (e.g. `author.name = "Alice"`) rejected by single-identifier regex `/^[a-zA-Z_][a-zA-Z0-9_]{0,62}$/`. | `evals/query/relational_and_sort.eval.ts` | `src/utils/sql_safe.ts`, `src/tools/search/query-builder.ts` | Structured relational identifier validation (`validateRelationalIdentifier`) protecting against SQL injection. |

---

## Invariant Directives

1. **No Silent Fallback**: Malformed user query inputs must **never** compile to `1=1` or empty matching groups.
2. **Safe Dialect Compilation**: SQL compilation must parameterize all literal values and validate all identifier segments.
3. **Verified Provider Capabilities**: Driver capabilities must accurately reflect what the underlying engine supports without speculative assumptions.

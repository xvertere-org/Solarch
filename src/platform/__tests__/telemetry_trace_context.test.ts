import { describe, it, expect } from 'vitest'
import { W3CTraceContext } from '../telemetry/trace-context.js'

describe('W3C Trace Context (traceparent) Validation & Parsing (Phase 8)', () => {
  it('1. Parses and validates a valid W3C traceparent header', () => {
    const validHeader = '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01'
    const parsed = W3CTraceContext.parse(validHeader)

    expect(parsed).not.toBeNull()
    expect(parsed?.version).toBe('00')
    expect(parsed?.traceId).toBe('4bf92f3577b34da6a3ce929d0e0e4736')
    expect(parsed?.parentSpanId).toBe('00f067aa0ba902b7')
    expect(parsed?.flags).toBe('01')
    expect(parsed?.sampled).toBe(true)
  })

  it('2. Rejects invalid traceparents (all zeros, invalid hex length, invalid version)', () => {
    expect(W3CTraceContext.isValid('00-00000000000000000000000000000000-00f067aa0ba902b7-01')).toBe(false)
    expect(W3CTraceContext.isValid('00-4bf92f3577b34da6a3ce929d0e0e4736-0000000000000000-01')).toBe(false)
    expect(W3CTraceContext.isValid('ff-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01')).toBe(false)
    expect(W3CTraceContext.isValid('invalid-traceparent')).toBe(false)
  })

  it('3. Generates valid canonical traceparent header', () => {
    const generated = W3CTraceContext.createTraceparent()
    expect(W3CTraceContext.isValid(generated)).toBe(true)
  })
})

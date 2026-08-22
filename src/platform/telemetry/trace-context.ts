/**
 * Solarch W3C Trace Context (traceparent) Parser & Validator (Phase 8)
 */

import * as crypto from 'crypto'

export const TRACEPARENT_REGEX = /^([0-9a-f]{2})-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$/i
export const ALL_ZEROS_32 = '00000000000000000000000000000000'
export const ALL_ZEROS_16 = '0000000000000000'

export interface ParsedTraceContext {
  version: string
  traceId: string
  parentSpanId: string
  flags: string
  sampled: boolean
}

export class W3CTraceContext {
  /**
   * Validates whether a header string matches strict W3C traceparent specification.
   */
  public static isValid(traceparent: string): boolean {
    if (!traceparent || typeof traceparent !== 'string') return false
    const match = TRACEPARENT_REGEX.exec(traceparent.trim())
    if (!match) return false

    const [, version, traceId, spanId] = match
    if (version === 'ff') return false
    if (traceId === ALL_ZEROS_32) return false
    if (spanId === ALL_ZEROS_16) return false

    return true
  }

  /**
   * Parses and validates a W3C traceparent string. Returns null on invalid format.
   */
  public static parse(traceparent: string): ParsedTraceContext | null {
    if (!W3CTraceContext.isValid(traceparent)) return null

    const match = TRACEPARENT_REGEX.exec(traceparent.trim())!
    const [, version, traceId, parentSpanId, flags] = match

    const flagNum = parseInt(flags, 16)
    const sampled = (flagNum & 0x01) === 1

    return {
      version: version.toLowerCase(),
      traceId: traceId.toLowerCase(),
      parentSpanId: parentSpanId.toLowerCase(),
      flags: flags.toLowerCase(),
      sampled,
    }
  }

  /**
   * Generates a new 32-hex trace ID.
   */
  public static generateTraceId(): string {
    let id = crypto.randomBytes(16).toString('hex')
    while (id === ALL_ZEROS_32) {
      id = crypto.randomBytes(16).toString('hex')
    }
    return id
  }

  /**
   * Generates a new 16-hex span ID.
   */
  public static generateSpanId(): string {
    let id = crypto.randomBytes(8).toString('hex')
    while (id === ALL_ZEROS_16) {
      id = crypto.randomBytes(8).toString('hex')
    }
    return id
  }

  /**
   * Generates a valid W3C traceparent string.
   */
  public static createTraceparent(
    traceId: string = W3CTraceContext.generateTraceId(),
    spanId: string = W3CTraceContext.generateSpanId(),
    sampled: boolean = true
  ): string {
    const flags = sampled ? '01' : '00'
    return `00-${traceId}-${spanId}-${flags}`
  }
}

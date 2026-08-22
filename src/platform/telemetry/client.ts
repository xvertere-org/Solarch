/**
 * Solarch Platform Telemetry API Client (Phase 8)
 *
 * Implements scoped requests to Platform Telemetry endpoints.
 */

import { PlatformClient } from '../client/platform-client.js'
import { TelemetrySanitiser } from './sanitiser.js'
import {
  AlertRule,
  AuditEvent,
  LogEntry,
  MetricsSnapshot,
  TraceSpan,
} from './types.js'

export class TelemetryClient {
  private client: PlatformClient

  constructor(client: PlatformClient) {
    this.client = client
  }

  /**
   * Fetches aggregated metrics snapshot for a project environment.
   */
  public async getMetrics(
    projectId: string,
    environment: string,
    windowMs: number = 60000,
    accessToken?: string
  ): Promise<MetricsSnapshot> {
    const raw = await this.client.get<MetricsSnapshot>(
      `/v1/projects/${encodeURIComponent(projectId)}/metrics?env=${encodeURIComponent(environment)}&window=${windowMs}`,
      { token: accessToken }
    )
    return TelemetrySanitiser.sanitize(raw)
  }

  /**
   * Fetches log entries for a project environment.
   */
  public async getLogs(
    projectId: string,
    environment: string,
    options: { limit?: number; level?: string; search?: string; since?: string } = {},
    accessToken?: string
  ): Promise<LogEntry[]> {
    const params = new URLSearchParams()
    params.set('env', environment)
    if (options.limit) params.set('limit', String(options.limit))
    if (options.level) params.set('level', options.level)
    if (options.search) params.set('search', options.search)
    if (options.since) params.set('since', options.since)

    const raw = await this.client.get<LogEntry[]>(
      `/v1/projects/${encodeURIComponent(projectId)}/logs?${params.toString()}`,
      { token: accessToken }
    )
    return TelemetrySanitiser.sanitize(raw)
  }

  /**
   * Fetches distributed trace spans for a project environment.
   */
  public async getTraces(
    projectId: string,
    environment: string,
    traceId?: string,
    accessToken?: string
  ): Promise<TraceSpan[]> {
    const query = traceId
      ? `?env=${encodeURIComponent(environment)}&traceId=${encodeURIComponent(traceId)}`
      : `?env=${encodeURIComponent(environment)}`

    const raw = await this.client.get<TraceSpan[]>(
      `/v1/projects/${encodeURIComponent(projectId)}/traces${query}`,
      { token: accessToken }
    )
    return TelemetrySanitiser.sanitize(raw)
  }

  /**
   * Fetches active alert rules and incident status for a project environment.
   */
  public async getAlerts(
    projectId: string,
    environment: string,
    accessToken?: string
  ): Promise<AlertRule[]> {
    const raw = await this.client.get<AlertRule[]>(
      `/v1/projects/${encodeURIComponent(projectId)}/alerts?env=${encodeURIComponent(environment)}`,
      { token: accessToken }
    )
    return TelemetrySanitiser.sanitize(raw)
  }

  /**
   * Fetches audit events for a project environment.
   */
  public async getAuditEvents(
    projectId: string,
    environment: string,
    accessToken?: string
  ): Promise<AuditEvent[]> {
    const raw = await this.client.get<AuditEvent[]>(
      `/v1/projects/${encodeURIComponent(projectId)}/audit?env=${encodeURIComponent(environment)}`,
      { token: accessToken }
    )
    return TelemetrySanitiser.sanitize(raw)
  }
}

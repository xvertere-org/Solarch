/**
 * @solarch/core-client - Realtime Transport Abstraction
 */

export interface RealtimeTransport {
  connect(url: string): Promise<void>
  disconnect(): void
  send(data: string): void
  onMessage(callback: (data: string) => void): void
  onOpen(callback: () => void): void
  onClose(callback: (code?: number, reason?: string) => void): void
  onError(callback: (err: any) => void): void
  isConnected(): boolean
}

/**
 * @solarch/core-client - Protocol Constants and Wire Frame Definitions
 */

export const PROTOCOL_VERSION = '1.0'
export const PROTOCOL_HEADER = 'X-Solarch-Protocol'

export interface RealtimeConnectedFrame {
  type: 'connected'
  clientId?: string
  protocolVersion: string
}

export interface RealtimeSubscribedFrame {
  type: 'subscribed'
  channels: string[]
}

export interface RealtimeEventFrame<T = any> {
  type: 'event'
  channel: string
  data: {
    action: 'create' | 'update' | 'delete'
    collectionId: string
    record?: T
    data?: { id: string }
    timestamp: string
    [key: string]: any
  }
}


export interface RealtimePingFrame {
  type: 'ping'
  timestamp?: number
}

export interface RealtimePongFrame {
  type: 'pong'
  timestamp?: number
}

export interface RealtimeSubscribeMessage {
  type: 'subscribe'
  channels: string[]
}

export interface RealtimeUnsubscribeMessage {
  type: 'unsubscribe'
  channels: string[]
}

export type RealtimeIncomingFrame =
  | RealtimeConnectedFrame
  | RealtimeSubscribedFrame
  | RealtimeEventFrame
  | RealtimePingFrame
  | RealtimePongFrame

export type RealtimeOutgoingMessage =
  | RealtimeSubscribeMessage
  | RealtimeUnsubscribeMessage
  | RealtimePongFrame

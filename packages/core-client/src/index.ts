/**
 * @solarch/core-client - Universal TypeScript SDK Kernel for Solarch
 */

export * from './contracts/index.js'
export * from './stores/index.js'
export * from './http/index.js'
export * from './services/index.js'
export * from './realtime/index.js'
export * from './utils/filter.js'
export * from './Client.js'

// Default export
import { SolarchClient } from './Client.js'
export default SolarchClient

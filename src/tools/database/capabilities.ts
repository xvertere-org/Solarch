import { DatabaseCapabilities } from './types'

export const SQLITE_CAPABILITIES: DatabaseCapabilities = {
  transactions: true,
  joins: true,
  indexes: true,
  views: true,
  foreignKeys: true,
  jsonOperations: true,
  migrations: true,
  vectorFunctions: true,
  explainOpcodes: true,
}

export const POSTGRES_CAPABILITIES: DatabaseCapabilities = {
  transactions: true,
  joins: true,
  indexes: true,
  views: true,
  foreignKeys: true,
  jsonOperations: true,
  migrations: true,
  vectorFunctions: false,
  explainOpcodes: false,
}

export const MONGODB_CAPABILITIES: DatabaseCapabilities = {
  transactions: true,
  joins: true,
  indexes: true,
  views: true,
  foreignKeys: false,
  jsonOperations: true,
  migrations: true,
  vectorFunctions: false,
  explainOpcodes: false,
}

export const D1_CAPABILITIES: DatabaseCapabilities = {
  transactions: false,
  joins: true,
  indexes: true,
  views: true,
  foreignKeys: true,
  jsonOperations: true,
  migrations: true,
  vectorFunctions: false,
  explainOpcodes: false,
}

export const UNSUPPORTED_CAPABILITIES: DatabaseCapabilities = {
  transactions: false,
  joins: false,
  indexes: false,
  views: false,
  foreignKeys: false,
  jsonOperations: false,
  migrations: false,
  vectorFunctions: false,
  explainOpcodes: false,
}
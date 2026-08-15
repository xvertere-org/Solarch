import { Dialect, DatabaseQuery } from '../types'
import { FilterAST } from '../../search/filter'
import { compileMongoFilter } from './filter'

export class MongoDialect implements Dialect {
  getDialect(): string {
    return 'mongodb'
  }

  compileFilter(ast: FilterAST, _prefix = '', _offset = 0): DatabaseQuery {
    const mongoFilter = compileMongoFilter(ast)
    return {
      text: JSON.stringify(mongoFilter),
      params: [],
    }
  }

  /**
   * Translates Solarch sort string (e.g. "-created,+id", "@random") into Mongo sort specification.
   */
  buildSort(sort: string): string {
    if (!sort || !sort.trim()) {
      return JSON.stringify({ id: 1 })
    }

    const sortSpec: Record<string, 1 | -1> = {}
    const parts = sort.split(',').map(s => s.trim()).filter(Boolean)

    for (const part of parts) {
      if (part === '@random') {
        // Mongo handles random via aggregation sample or fallback
        continue
      }
      if (part.startsWith('-')) {
        const field = part.substring(1).trim()
        if (field) sortSpec[field] = -1
      } else if (part.startsWith('+')) {
        const field = part.substring(1).trim()
        if (field) sortSpec[field] = 1
      } else {
        sortSpec[part] = 1
      }
    }

    // Stable tie-break fallback on id ASC if not specified
    if (!('id' in sortSpec)) {
      sortSpec.id = 1
    }

    return JSON.stringify(sortSpec)
  }

  escapeField(field: string): string {
    return field.trim()
  }
}

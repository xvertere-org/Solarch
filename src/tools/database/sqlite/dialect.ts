import { SqliteQueryBuilder } from '../../search/query-builder'
import { FilterAST } from '../../search/filter'
import { DatabaseQuery } from '../types'

export class SQLiteDialect {
  private builder = new SqliteQueryBuilder()

  getDialect(): string {
    return 'sqlite'
  }

  compileFilter(ast: FilterAST, prefix = '', offset = 0): DatabaseQuery {
    const { where, params } = this.builder.buildWhere(ast, offset)
    const text = prefix ? `${prefix} WHERE ${where}` : where
    return { text, params }
  }

  buildSort(sort: string): string {
    return this.builder.buildSort(sort)
  }

  escapeField(field: string): string {
    return this.builder.escapeField(field)
  }
}
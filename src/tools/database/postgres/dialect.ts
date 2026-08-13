import { Dialect, DatabaseQuery } from '../types'
import { FilterAST } from '../../search/filter'
import { PostgresQueryBuilder } from './query-builder'

export class PostgresDialect implements Dialect {
  private readonly builder = new PostgresQueryBuilder()

  getDialect(): string {
    return 'postgres'
  }

  compileFilter(ast: FilterAST, prefix = '', offset = 0): DatabaseQuery {
    const { where, params } = this.builder.buildWhere(ast, offset)
    return {
      text: prefix ? `${prefix} WHERE ${where}` : where,
      params,
    }
  }

  buildSort(sort: string): string {
    return this.builder.buildSort(sort)
  }

  escapeField(field: string): string {
    return this.builder.escapeField(field)
  }
}
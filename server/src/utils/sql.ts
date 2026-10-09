type SqlValue = string | number | null

/**
 * Builds a parameterized UPDATE from a validated patch.
 * Column names come only from the hard-coded `columns` map, never from user input.
 * Keys whose value is `undefined` are skipped. Returns null when nothing changes.
 */
export function buildUpdate<P extends object>(
  table: string,
  columns: { [K in keyof P]?: string },
  patch: P,
  id: number,
): { sql: string; params: SqlValue[] } | null {
  const sets: string[] = []
  const params: SqlValue[] = []

  for (const key of Object.keys(columns) as (keyof P)[]) {
    const value = patch[key]
    if (value === undefined) continue
    sets.push(`${columns[key]} = ?`)
    params.push(value as SqlValue)
  }

  if (sets.length === 0) return null

  sets.push('updated_at = CURRENT_TIMESTAMP')
  params.push(id)
  return { sql: `UPDATE ${table} SET ${sets.join(', ')} WHERE id = ?`, params }
}

/** LIKE pattern matching `term` anywhere. Use together with `ESCAPE '\'`. */
export function likeAnywhere(term: string): string {
  return `%${term.replace(/[\\%_]/g, (c) => `\\${c}`)}%`
}

export interface Pagination {
  page?: number | undefined
  limit?: number | undefined
}

/** Returns a LIMIT/OFFSET clause and its params, or nothing when no limit was requested. */
export function paginate({ page, limit }: Pagination): { clause: string; params: number[] } {
  if (!limit) return { clause: '', params: [] }
  return { clause: ' LIMIT ? OFFSET ?', params: [limit, ((page ?? 1) - 1) * limit] }
}

/** SQLite CURRENT_TIMESTAMP (UTC, "YYYY-MM-DD HH:MM:SS") rendered as ISO-8601. */
export function isoTimestamp(column: string): string {
  return `strftime('%Y-%m-%dT%H:%M:%SZ', ${column})`
}

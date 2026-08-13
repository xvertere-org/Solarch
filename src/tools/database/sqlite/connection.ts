import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

export class SQLiteConnection {
  readonly dataDB: Database.Database
  readonly auxDB: Database.Database

  constructor(dataDir: string, queryTimeout = 30) {
    fs.mkdirSync(dataDir, { recursive: true })
    this.dataDB = new Database(path.join(dataDir, 'data.db'))
    this.auxDB = new Database(path.join(dataDir, 'auxiliary.db'))
    for (const db of [this.dataDB, this.auxDB]) {
      db.pragma('journal_mode = WAL')
      db.pragma(`busy_timeout = ${queryTimeout * 1000}`)
      db.pragma('foreign_keys = ON')
    }

    const cosineSimilarity = (aJson: string, bJson: string): number | null => {
      try {
        const a = JSON.parse(aJson) as number[]
        const b = JSON.parse(bJson) as number[]
        if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return null
        let dot = 0, normA = 0, normB = 0
        for (let i = 0; i < a.length; i++) {
          dot += a[i] * b[i]
          normA += a[i] * a[i]
          normB += b[i] * b[i]
        }
        if (normA === 0 || normB === 0) return null
        return dot / (Math.sqrt(normA) * Math.sqrt(normB))
      } catch { return null }
    }
    this.dataDB.function('vector_cosine_similarity', { deterministic: true }, cosineSimilarity)
  }

  close(): void {
    this.dataDB.close()
    this.auxDB.close()
  }
}

import { describe, it, expect } from 'vitest'
import { RecommendationEngine } from '../recommendation'
import { ProjectIntent } from '../intent'

describe('RecommendationEngine Contract Rules (Phase 0)', () => {
  it('Rule 1 & 3: AI application recommends PostgreSQL + pgvector capability with reason', () => {
    const intent = new ProjectIntent({ application: 'ai' })
    const recs = RecommendationEngine.recommend(intent)

    expect(recs.database.value).toBe('postgres')
    expect(recs.database.source).toBe('application-type')
    expect(recs.database.reason).toMatch(/pgvector/)
    expect(recs.databaseCapabilities.vector).toBe(true)
  })

  it('Rule 2 & 3: Agent application recommends PostgreSQL + pgvector capability', () => {
    const intent = new ProjectIntent({ application: 'agent' })
    const recs = RecommendationEngine.recommend(intent)

    expect(recs.database.value).toBe('postgres')
    expect(recs.databaseCapabilities.vector).toBe(true)
  })

  it('Rule 4: Local + Cloud deployment recommends sqlite_local_postgres_cloud topology', () => {
    const intent = new ProjectIntent({
      application: 'api',
      deployment: 'local_and_cloud',
    })
    const recs = RecommendationEngine.recommend(intent)

    expect(recs.databaseTopology).toBe('sqlite_local_postgres_cloud')
    expect(recs.database.source).toBe('deployment')
    expect(recs.database.reason).toMatch(/SQLite for zero-latency local development and PostgreSQL for cloud/)
  })

  it('Rule 5: Explicit MongoDB selection is respected over application recommendation', () => {
    const intent = new ProjectIntent({
      application: 'ai',
      explicitChoices: {
        database: 'mongodb',
      },
    })
    const plan = RecommendationEngine.createPlan({ name: 'ai-mongo-app', dir: './ai-mongo-app' }, intent)

    expect(plan.database.engine).toBe('mongodb')
    expect(plan.database.topology).toBe('mongodb_only')
    expect(plan.database.source).toBe('user')
  })

  it('Rule 6: Explicit user choices strictly override system recommendations', () => {
    const intent = new ProjectIntent({
      application: 'ai',
      explicitChoices: {
        database: 'sqlite',
        sdks: ['solarch-web'],
      },
    })
    const plan = RecommendationEngine.createPlan({ name: 'ai-sqlite-app', dir: './ai-sqlite-app' }, intent)

    expect(plan.database.engine).toBe('sqlite')
    expect(plan.database.source).toBe('user')
    expect(plan.sdks.selected).toEqual(['solarch-web'])
    expect(plan.sdks.source).toBe('user')
    expect(plan.sdks.isOverridden()).toBe(true)
  })

  it('Rule 7: Web application recommends solarch-web', () => {
    const intent = new ProjectIntent({ application: 'web' })
    const recs = RecommendationEngine.recommend(intent)

    expect(recs.sdks.some(s => s.packageName === 'solarch-web')).toBe(true)
  })

  it('Rule 8: AI & Agent applications recommend solarch-ai', () => {
    const intentAi = new ProjectIntent({ application: 'ai' })
    const recsAi = RecommendationEngine.recommend(intentAi)
    expect(recsAi.sdks.some(s => s.packageName === 'solarch-ai')).toBe(true)

    const intentAgent = new ProjectIntent({ application: 'agent' })
    const recsAgent = RecommendationEngine.recommend(intentAgent)
    expect(recsAgent.sdks.some(s => s.packageName === 'solarch-ai')).toBe(true)
  })

  it('Rule 9: Mobile application recommends solarch-rn', () => {
    const intent = new ProjectIntent({ application: 'mobile' })
    const recs = RecommendationEngine.recommend(intent)

    expect(recs.sdks.some(s => s.packageName === 'solarch-rn')).toBe(true)
  })

  it('Rule 10: Desktop application recommends solarch-electron / solarch-tauri based on runtime', () => {
    const intentUnspec = new ProjectIntent({ application: 'desktop' })
    const recs = RecommendationEngine.recommend(intentUnspec)
    expect(recs.sdks.some(s => s.packageName === 'solarch-electron')).toBe(true)
    expect(recs.desktopRuntime?.value).toBe('electron')

    const intentTauri = new ProjectIntent({
      application: 'desktop',
      desktopRuntime: 'tauri',
      explicitChoices: { desktopRuntime: 'tauri' },
    })
    const recsTauri = RecommendationEngine.recommend(intentTauri)
    expect(recsTauri.sdks.some(s => s.packageName === 'solarch-tauri')).toBe(true)

    const planTauri = RecommendationEngine.createPlan({ name: 'tauri-app', dir: './tauri-app' }, intentTauri)
    expect(planTauri.desktop.runtime).toBe('tauri')
  })
})

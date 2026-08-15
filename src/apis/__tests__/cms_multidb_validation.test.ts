import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { MongoMemoryReplSet } from 'mongodb-memory-server'
import { BaseApp } from '../../core/base'
import { Collection } from '../../core/collection'
import { RecordModel as PBRecord } from '../../core/record'
import { findRecordById, findAllRecords } from '../../core/record_query'
import { canAccessRecord } from '../record_helpers'
import { RequestInfo } from '../../core/record_field_resolver'

interface ProviderTestEnv {
  name: 'sqlite' | 'mongodb'
  init: () => Promise<BaseApp>
  cleanup: () => Promise<void>
}

describe('Headless CMS Multi-Database Semantic Equivalence Laboratory (DB-MONGO-20.5)', () => {
  let replSet: MongoMemoryReplSet | null = null
  let mongoUri: string

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } })
    mongoUri = replSet.getUri()
  }, 60000)

  afterAll(async () => {
    if (replSet) {
      await replSet.stop()
    }
  }, 60000)

  const providers: ProviderTestEnv[] = [
    {
      name: 'sqlite',
      init: async () => {
        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'solarch-cms-sqlite-'))
        const app = new BaseApp({ dataDir: tmpDir })
        await app.bootstrap()
        ;(app as any)._tmpDir = tmpDir
        return app
      },
      cleanup: async () => {},
    },
    {
      name: 'mongodb',
      init: async () => {
        const app = new BaseApp({
          db: {
            provider: 'mongodb',
            connectionString: mongoUri,
            database: `solarch_cms_${Date.now()}`,
            queryTimeout: 10,
          },
        })
        await app.bootstrap()
        return app
      },
      cleanup: async () => {},
    },
  ]

  providers.forEach(provider => {
    describe(`CMS Semantic Equivalence on [${provider.name.toUpperCase()}]`, () => {
      let app: BaseApp
      let categoriesCol: Collection
      let usersCol: Collection
      let articlesCol: Collection

      beforeAll(async () => {
        app = await provider.init()

        // 1. Categories collection
        categoriesCol = new Collection({
          id: 'col_categories',
          name: 'categories',
          type: 'base',
          fields: [
            { name: 'name', type: 'text', required: true },
            { name: 'slug', type: 'text', required: true, unique: true },
          ],
          listRule: '',
          viewRule: '',
          createRule: '@request.auth.role = "admin"',
          updateRule: '@request.auth.role = "admin"',
          deleteRule: '@request.auth.role = "admin"',
        })
        await app.save(categoriesCol)

        // 2. Authors / Users collection
        usersCol = new Collection({
          id: 'col_users',
          name: 'users',
          type: 'auth',
          fields: [
            { name: 'name', type: 'text' },
            { name: 'role', type: 'text', required: true },
          ],
          listRule: '@request.auth.id != ""',
          viewRule: '@request.auth.id != ""',
        })
        await app.save(usersCol)

        // 3. Articles collection with 1:N relations and auth rules
        articlesCol = new Collection({
          id: 'col_articles',
          name: 'articles',
          type: 'base',
          fields: [
            { name: 'title', type: 'text', required: true },
            { name: 'slug', type: 'text', required: true, unique: true },
            { name: 'content', type: 'text' },
            { name: 'status', type: 'text', required: true },
            { name: 'category', type: 'relation', collectionId: 'col_categories' },
            { name: 'authorId', type: 'text', required: true },
            { name: 'views', type: 'number' },
          ],
          listRule: '@request.auth.id != "" || status = "published"',
          viewRule: '@request.auth.id != "" || status = "published"',
          createRule: '@request.auth.id != ""',
          updateRule: '@request.auth.id = authorId || @request.auth.role = "editor" || @request.auth.role = "admin"',
          deleteRule: '@request.auth.role = "admin"',
        })
        await app.save(articlesCol)
      })

      afterAll(async () => {
        if (app) {
          await app.db().getDriver().close()
          if ((app as any)._tmpDir) {
            fs.rmSync((app as any)._tmpDir, { recursive: true, force: true })
          }
        }
      })

      it('Administrator Workflow: full taxonomy & article CRUD and publishing', async () => {
        const adminUser = new PBRecord(usersCol.id, usersCol.name, { role: 'admin', name: 'Admin User' })
        adminUser.id = 'usr_admin'

        const adminReq: RequestInfo = {
          auth: adminUser,
          isAdmin: true,
          method: 'POST',
          headers: {},
          query: {},
          body: {},
          data: {},
          context: 'create',
        }

        // Admin creates Category
        const cat = new PBRecord(categoriesCol.id, categoriesCol.name, {
          name: 'Technology',
          slug: 'tech',
        })
        cat.id = 'cat_tech_12345'
        await app.save(cat)

        // Admin creates Article
        const article = new PBRecord(articlesCol.id, articlesCol.name, {
          title: 'Solarch Multi-Database',
          slug: 'solarch-multi-db',
          content: 'Unified document and relational storage.',
          status: 'published',
          category: cat.id,
          authorId: 'usr_admin',
          views: 100,
        })
        article.id = 'art_admin_01'
        await app.save(article)

        // Admin reads Article
        const found = await findRecordById(app, 'articles', 'art_admin_01')
        expect(found).not.toBeNull()
        expect(found!.get('title')).toBe('Solarch Multi-Database')
        expect(found!.get('status')).toBe('published')
        expect(found!.get('category')).toBe('cat_tech_12345')

        // Admin updates Article
        found!.set('title', 'Solarch Multi-Database Architecture')
        await app.save(found!)

        const updated = await findRecordById(app, 'articles', 'art_admin_01')
        expect(updated!.get('title')).toBe('Solarch Multi-Database Architecture')

        // Admin deletes Article
        const canDel = await canAccessRecord(app, updated!, articlesCol, articlesCol.deleteRule, adminReq)
        expect(canDel).toBe(true)
        await app.delete(updated!)
        expect(await findRecordById(app, 'articles', 'art_admin_01')).toBeNull()
      })

      it('Editor Workflow: edit permissions and forbidden admin operations', async () => {
        const editorUser = new PBRecord(usersCol.id, usersCol.name, { role: 'editor', name: 'Editor 1' })
        editorUser.id = 'usr_editor_1'

        const editorReq: RequestInfo = {
          auth: editorUser,
          isAdmin: false,
          method: 'PATCH',
          headers: {},
          query: {},
          body: {},
          data: {},
          context: 'update',
        }

        // Create an article written by another author
        const article = new PBRecord(articlesCol.id, articlesCol.name, {
          title: 'Draft Post',
          slug: 'draft-post-1',
          content: 'Needs editorial review',
          status: 'draft',
          authorId: 'usr_author_1',
          views: 10,
        })
        article.id = 'art_editor_test'
        await app.save(article)

        // Editor is allowed to update any article
        const canEdit = await canAccessRecord(app, article, articlesCol, articlesCol.updateRule, editorReq)
        expect(canEdit).toBe(true)

        // Editor is forbidden from deleting articles (deleteRule requires admin)
        const canDelete = await canAccessRecord(app, article, articlesCol, articlesCol.deleteRule, editorReq)
        expect(canDelete).toBe(false)
      })

      it('Author Workflow: author access control, cross-user edits, and taxonomy protection', async () => {
        const author1User = new PBRecord(usersCol.id, usersCol.name, { role: 'author', name: 'Author 1' })
        author1User.id = 'usr_author_1'

        const author2User = new PBRecord(usersCol.id, usersCol.name, { role: 'author', name: 'Author 2' })
        author2User.id = 'usr_author_2'

        const author1Req: RequestInfo = {
          auth: author1User,
          isAdmin: false,
          method: 'PATCH',
          headers: {},
          query: {},
          body: {},
          data: {},
          context: 'update',
        }

        const author2Req: RequestInfo = {
          auth: author2User,
          isAdmin: false,
          method: 'PATCH',
          headers: {},
          query: {},
          body: {},
          data: {},
          context: 'update',
        }

        const ownArticle = new PBRecord(articlesCol.id, articlesCol.name, {
          title: 'Author 1 Article',
          slug: 'author-1-article',
          status: 'draft',
          authorId: 'usr_author_1',
        })
        ownArticle.id = 'art_author_1_own'
        await app.save(ownArticle)

        // Author 1 can update their own article
        const author1CanEdit = await canAccessRecord(app, ownArticle, articlesCol, articlesCol.updateRule, author1Req)
        expect(author1CanEdit).toBe(true)

        // Author 2 CANNOT update Author 1's article
        const author2CanEdit = await canAccessRecord(app, ownArticle, articlesCol, articlesCol.updateRule, author2Req)
        expect(author2CanEdit).toBe(false)

        // Author 1 cannot delete their own article (requires admin)
        const author1CanDelete = await canAccessRecord(app, ownArticle, articlesCol, articlesCol.deleteRule, author1Req)
        expect(author1CanDelete).toBe(false)

        // Author 1 cannot create a category (requires admin)
        const cat = new PBRecord(categoriesCol.id, categoriesCol.name, { name: 'Forbidden Cat', slug: 'forbidden' })
        const authorCanCreateTaxonomy = await canAccessRecord(app, cat, categoriesCol, categoriesCol.createRule, author1Req)
        expect(authorCanCreateTaxonomy).toBe(false)
      })
    })
  })
})

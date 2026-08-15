import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { MongoMemoryReplSet } from 'mongodb-memory-server'
import { BaseApp } from '../../../../core/base'
import { Collection } from '../../../../core/collection'
import { RecordModel as PBRecord } from '../../../../core/record'
import { findRecordById, findAllRecords } from '../../../../core/record_query'
import { enrichRecord, enrichRecords } from '../../../../apis/record_helpers'

describe('MongoDB Full Relation Semantics Matrix (DB-MONGO-13.5)', () => {
  let replSet: MongoMemoryReplSet
  let uri: string
  let app: BaseApp

  let deptCol: Collection
  let catCol: Collection
  let userCol: Collection
  let tagCol: Collection
  let postCol: Collection

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } })
    uri = replSet.getUri()

    app = new BaseApp({
      db: {
        provider: 'mongodb',
        connectionString: uri,
        database: 'solarch_relations_matrix_test',
        queryTimeout: 10,
      },
    })
    await app.bootstrap()

    // 1. Department (for nested relations)
    deptCol = new Collection({
      id: 'col_departments',
      name: 'departments',
      type: 'base',
      fields: [{ name: 'name', type: 'text', required: true }],
    })
    await app.save(deptCol)

    // 2. Category (has relation to Department)
    catCol = new Collection({
      id: 'col_categories',
      name: 'categories',
      type: 'base',
      fields: [
        { name: 'name', type: 'text', required: true },
        { name: 'deptId', type: 'relation', collectionId: 'col_departments' },
      ],
    })
    await app.save(catCol)

    // 3. User / Author (Auth/Base)
    userCol = new Collection({
      id: 'col_users',
      name: 'authors',
      type: 'base',
      fields: [
        { name: 'username', type: 'text', required: true },
        { name: 'role', type: 'text', required: true },
      ],
    })
    await app.save(userCol)

    // 4. Tags (for N:M relations)
    tagCol = new Collection({
      id: 'col_tags',
      name: 'tags',
      type: 'base',
      fields: [{ name: 'label', type: 'text', required: true }],
    })
    await app.save(tagCol)

    // 5. Posts (combines 1:1, 1:N, N:1, N:M tags, nullable)
    postCol = new Collection({
      id: 'col_posts',
      name: 'posts',
      type: 'base',
      fields: [
        { name: 'title', type: 'text', required: true },
        { name: 'status', type: 'text', required: true },
        { name: 'categoryId', type: 'relation', collectionId: 'col_categories' },
        { name: 'authorId', type: 'relation', collectionId: 'col_users' },
        { name: 'tagIds', type: 'relation', collectionId: 'col_tags', multiple: true },
      ],
    })
    await app.save(postCol)
  }, 60000)

  afterAll(async () => {
    if (app) {
      await app.db().getDriver().close()
    }
    if (replSet) {
      await replSet.stop()
    }
  }, 60000)

  it('1:1 & N:1 Relations: resolves single foreign record reference', async () => {
    const author = new PBRecord(userCol.id, userCol.name, { username: 'alice', role: 'writer' })
    author.id = 'usr_alice_1'
    await app.save(author)

    const post = new PBRecord(postCol.id, postCol.name, {
      title: 'First Post',
      status: 'published',
      authorId: author.id,
    })
    post.id = 'post_1'
    await app.save(post)

    const fetched = await findRecordById(app, 'posts', 'post_1')
    expect(fetched).not.toBeNull()
    expect(fetched!.get('authorId')).toBe('usr_alice_1')

    const enriched = await enrichRecord(app, postCol, fetched!, { expands: ['authorId'] })
    const json = enriched.toJSON()
    expect(json.expand?.authorId).toBeDefined()
    expect(json.expand?.authorId.username).toBe('alice')
  })

  it('1:N Relations: fetches multiple posts belonging to one category', async () => {
    const cat = new PBRecord(catCol.id, catCol.name, { name: 'Engineering' })
    cat.id = 'cat_eng_1'
    await app.save(cat)

    const post1 = new PBRecord(postCol.id, postCol.name, {
      title: 'Post 1',
      status: 'published',
      categoryId: cat.id,
    })
    post1.id = 'post_eng_1'
    await app.save(post1)

    const post2 = new PBRecord(postCol.id, postCol.name, {
      title: 'Post 2',
      status: 'published',
      categoryId: cat.id,
    })
    post2.id = 'post_eng_2'
    await app.save(post2)

    const res = await findAllRecords(app, 'posts', { filter: `categoryId = "${cat.id}"` })
    expect(res.items.length).toBe(2)
    const titles = res.items.map(p => p.get('title')).sort()
    expect(titles).toEqual(['Post 1', 'Post 2'])
  })

  it('N:M Multi-Relations: stores and expands arrays of related IDs', async () => {
    const tag1 = new PBRecord(tagCol.id, tagCol.name, { label: 'Typescript' })
    tag1.id = 'tag_ts_1'
    await app.save(tag1)

    const tag2 = new PBRecord(tagCol.id, tagCol.name, { label: 'MongoDB' })
    tag2.id = 'tag_mongo_1'
    await app.save(tag2)

    const post = new PBRecord(postCol.id, postCol.name, {
      title: 'Fullstack Guide',
      status: 'published',
      tagIds: [tag1.id, tag2.id],
    })
    post.id = 'post_tags_1'
    await app.save(post)

    const fetched = await findRecordById(app, 'posts', 'post_tags_1')
    expect(fetched).not.toBeNull()

    const enriched = await enrichRecord(app, postCol, fetched!, { expands: ['tagIds'] })
    const json = enriched.toJSON()
    expect(json.expand?.tagIds).toBeDefined()
    expect(Array.isArray(json.expand?.tagIds)).toBe(true)
    expect(json.expand?.tagIds.length).toBe(2)
    const labels = json.expand?.tagIds.map((t: any) => t.label).sort()
    expect(labels).toEqual(['MongoDB', 'Typescript'])
  })

  it('Nullable Relations: handles null and empty relation targets gracefully', async () => {
    const post = new PBRecord(postCol.id, postCol.name, {
      title: 'Null Category Post',
      status: 'draft',
      categoryId: null,
      authorId: null,
      tagIds: [],
    })
    post.id = 'post_null_1'
    await app.save(post)

    const fetched = await findRecordById(app, 'posts', 'post_null_1')
    expect(fetched).not.toBeNull()
    expect(fetched!.get('categoryId')).toBeNull()
    expect(fetched!.get('authorId')).toBeNull()

    const enriched = await enrichRecord(app, postCol, fetched!, { expands: ['categoryId', 'authorId'] })
    const json = enriched.toJSON()
    expect(json.expand?.categoryId).toBeUndefined()
    expect(json.expand?.authorId).toBeUndefined()
  })

  it('Missing Targets: non-existent foreign ID does not throw, omits expand gracefully', async () => {
    const post = new PBRecord(postCol.id, postCol.name, {
      title: 'Ghost Target Post',
      status: 'draft',
      categoryId: 'cat_nonexistent_999',
    })
    post.id = 'post_ghost_1'
    await app.save(post)

    const fetched = await findRecordById(app, 'posts', 'post_ghost_1')
    expect(fetched).not.toBeNull()

    const enriched = await enrichRecord(app, postCol, fetched!, { expands: ['categoryId'] })
    const json = enriched.toJSON()
    expect(json.expand?.categoryId).toBeUndefined()
  })

  it('Deleted Targets (DB-MONGO-13.5): nullifies relation on target deletion', async () => {
    const tempAuthor = new PBRecord(userCol.id, userCol.name, { username: 'bob', role: 'guest' })
    tempAuthor.id = 'usr_bob_temp'
    await app.save(tempAuthor)

    const post = new PBRecord(postCol.id, postCol.name, {
      title: 'Bob Post',
      status: 'published',
      authorId: tempAuthor.id,
    })
    post.id = 'post_bob_1'
    await app.save(post)

    // Delete author
    await app.delete(tempAuthor)

    // Verify post's authorId was nullified by cascade cleanup
    const updatedPost = await findRecordById(app, 'posts', 'post_bob_1')
    expect(updatedPost).not.toBeNull()
    expect(updatedPost!.get('authorId')).toBeNull()
  })

  it('Nested Relations: expands relation chains (Post -> Category -> Department)', async () => {
    const dept = new PBRecord(deptCol.id, deptCol.name, { name: 'Technology' })
    dept.id = 'dept_tech_1'
    await app.save(dept)

    const cat = new PBRecord(catCol.id, catCol.name, { name: 'Backend', deptId: dept.id })
    cat.id = 'cat_back_1'
    await app.save(cat)

    const post = new PBRecord(postCol.id, postCol.name, {
      title: 'Architecture Overview',
      status: 'published',
      categoryId: cat.id,
    })
    post.id = 'post_nested_1'
    await app.save(post)

    const fetched = await findRecordById(app, 'posts', 'post_nested_1')
    expect(fetched).not.toBeNull()

    const enriched = await enrichRecord(app, postCol, fetched!, { expands: ['categoryId', 'categoryId.deptId'] })
    const json = enriched.toJSON()
    expect(json.expand?.categoryId).toBeDefined()
    expect(json.expand?.categoryId.name).toBe('Backend')
    expect(json.expand?.categoryId.expand?.deptId).toBeDefined()
    expect(json.expand?.categoryId.expand?.deptId.name).toBe('Technology')
  })
})

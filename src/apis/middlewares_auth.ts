import { Request, Response, NextFunction } from 'express'
import { BaseApp } from '../core/base'
import { RecordModel as PBRecord } from '../core/record'
import { findAuthRecordByToken } from '../core/record_query'

export interface AuthContext {
  record: PBRecord | null
  isAdmin: boolean
  token: string | null
}

declare global {
  namespace Express {
    interface Request {
      authContext?: AuthContext
    }
  }
}

function setAuthContext(
  req: Request,
  record: PBRecord | null,
  isAdmin: boolean,
  token: string | null
): void {
  req.authContext = {
    record,
    isAdmin,
    token,
  }
}

function extractBearerToken(authHeader?: string): string | null {
  if (!authHeader) {
    return null
  }

  return authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : authHeader
}

async function authenticateRecord(
  app: BaseApp,
  token: string
): Promise<PBRecord | null> {
  try {
    return await findAuthRecordByToken(app, token)
  } catch {
    return null
  }
}

function authenticateAdmin(
  app: BaseApp,
  adminId: string
): boolean {
  try {
    const db = app.db().getDataDB()

    const row = db
      .prepare(`SELECT id FROM _superusers WHERE id = ?`)
      .get(adminId)

    return !!row
  } catch {
    // _superusers table may not exist yet
    return false
  }
}
export function loadAuthToken(app: BaseApp) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const token = extractBearerToken(req.headers.authorization)

    if (!token) {
      setAuthContext(req, null, false, null)
      return next()
    }

    const payload = app.parseJWT(token, app.getJwtSecret())

    if (!payload) {
      setAuthContext(req, null, false, null)
      return next()
    }

    if (payload.isAdmin) {
      setAuthContext(req, null, true, token)
      return next()
    }

    if (payload.type === 'auth') {
      const record = await authenticateRecord(app, token)

      if (record) {
        setAuthContext(req, record, false, token)
        return next()
      }

      setAuthContext(req, null, false, null)
      return next()
    }

    if (payload.type === 'admin' && payload.id) {
      if (authenticateAdmin(app, payload.id)) {
        setAuthContext(req, null, true, token)
        return next()
      }
    }

    setAuthContext(req, null, false, token)
    next()
  }
}
  export function requireAuth(app: BaseApp) {
    return async (req: Request, res: Response, next: NextFunction) => {
      if (!req.authContext?.record && !req.authContext?.isAdmin) {
        return res.status(401).json({ code: 401, message: 'Authentication required.' })
      }
      next()
    }
  }

  export function requireSuperuserAuth(app: BaseApp) {
    return async (req: Request, res: Response, next: NextFunction) => {
      if (!req.authContext?.isAdmin) {
        return res.status(403).json({ code: 403, message: 'Superuser authentication required.' })
      }
      next()
    }
  }

  export function requireSameCollectionContextAuth(collectionIdOrName: string) {
    return async (req: Request, res: Response, next: NextFunction) => {
      const ctx = req.authContext
      if (ctx?.record && ctx.record.collectionName !== collectionIdOrName && ctx.record.collectionId !== collectionIdOrName) {
        return res.status(403).json({ code: 403, message: 'Invalid collection context.' })
      }
      next()
    }
  }

  export function requireGuestOnly() {
    return async (req: Request, res: Response, next: NextFunction) => {
      if (req.authContext?.record || req.authContext?.isAdmin) {
        return res.status(400).json({ code: 400, message: 'Only guests can access this endpoint.' })
      }
      next()
    }
  }

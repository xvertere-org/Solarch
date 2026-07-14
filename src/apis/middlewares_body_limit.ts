import { Request, Response, NextFunction } from 'express'

export function bodyLimitMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = parseInt(req.headers['content-length'] || '0', 10)
    const maxSize = 10 * 1024 * 1024

    if (contentLength > maxSize) {
      return res.status(413).json({ code: 413, message: 'Request body too large.' })
    }

    next()
  }
}

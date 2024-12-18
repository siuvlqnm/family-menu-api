import { Context, Next } from 'hono'

export const logger = () => {
  return async (c: Context, next: Next) => {
    const start = Date.now()
    const { method, url } = c.req
    const ip = c.req.header('cf-connecting-ip') || 'unknown'
    
    try {
      await next()
      
      const end = Date.now()
      const status = c.res.status
      const duration = end - start
      
      // 记录请求信息
      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        ip,
        method,
        url,
        status,
        duration,
        userAgent: c.req.header('user-agent'),
      }))
    } catch (err) {
      const end = Date.now()
      const duration = end - start
      
      // 记录错误信息
      console.error(JSON.stringify({
        timestamp: new Date().toISOString(),
        ip,
        method,
        url,
        error: err instanceof Error ? err.message : 'Unknown error',
        duration,
        userAgent: c.req.header('user-agent'),
      }))
      
      throw err
    }
  }
}

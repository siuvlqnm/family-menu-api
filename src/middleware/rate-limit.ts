import { Context, Next } from 'hono'
import { HTTPException } from 'hono/http-exception'

const RATE_LIMIT_WINDOW = 60 * 1000 // 1分钟窗口期
const MAX_REQUESTS = 100 // 每个窗口期最大请求数

interface RateLimitInfo {
  count: number
  resetAt: number
}

const ipRequestMap = new Map<string, RateLimitInfo>()

export const rateLimit = () => {
  return async (c: Context, next: Next) => {
    const ip = c.req.header('cf-connecting-ip') || 'unknown'
    const now = Date.now()
    
    let info = ipRequestMap.get(ip)
    
    if (!info || now > info.resetAt) {
      info = {
        count: 0,
        resetAt: now + RATE_LIMIT_WINDOW
      }
    }
    
    info.count++
    
    if (info.count > MAX_REQUESTS) {
      throw new HTTPException(429, { message: 'Too Many Requests' })
    }
    
    ipRequestMap.set(ip, info)
    
    // 设置速率限制响应头
    c.header('X-RateLimit-Limit', MAX_REQUESTS.toString())
    c.header('X-RateLimit-Remaining', (MAX_REQUESTS - info.count).toString())
    c.header('X-RateLimit-Reset', info.resetAt.toString())
    
    await next()
  }
}

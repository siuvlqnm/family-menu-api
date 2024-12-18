// 使用 Web Crypto API 进行密码哈希
export async function hashPassword(password: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, data);
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// 验证密码
export async function verifyPassword(password: string, hash: string, secret: string): Promise<boolean> {
  const passwordHash = await hashPassword(password, secret);
  return passwordHash === hash;
}

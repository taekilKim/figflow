/**
 * Vercel Serverless Function
 * Figma OAuth code를 access_token으로 교환
 */
export default async function handler(req, res) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  // OPTIONS 요청 (preflight) 처리
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  // POST 요청만 허용
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { code, redirect_uri } = req.body

    if (!code || !redirect_uri) {
      return res.status(400).json({ error: 'Missing code or redirect_uri' })
    }

    // 환경변수에서 client_secret 가져오기 (서버에서만 접근 가능)
    const clientId = process.env.VITE_FIGMA_CLIENT_ID
    const clientSecret = process.env.VITE_FIGMA_CLIENT_SECRET

    if (!clientId || !clientSecret) {
      console.error('Missing environment variables')
      return res.status(500).json({ error: 'Server configuration error' })
    }

    // Figma API로 토큰 교환 요청
    const tokenResponse = await fetch('https://www.figma.com/api/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('Figma token exchange failed:', errorText)
      return res.status(tokenResponse.status).json({
        error: 'Token exchange failed',
        details: errorText
      })
    }

    const tokenData = await tokenResponse.json()

    // access_token만 반환 (client_secret은 절대 클라이언트로 보내지 않음)
    return res.status(200).json({
      access_token: tokenData.access_token,
      expires_in: tokenData.expires_in,
      refresh_token: tokenData.refresh_token,
    })

  } catch (error) {
    console.error('Token exchange error:', error)
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

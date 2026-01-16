/**
 * 환경변수 테스트 엔드포인트
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')

  const hasClientId = !!process.env.VITE_FIGMA_CLIENT_ID
  const hasClientSecret = !!process.env.VITE_FIGMA_CLIENT_SECRET

  return res.status(200).json({
    status: 'ok',
    environment: {
      hasClientId,
      hasClientSecret,
      clientIdLength: process.env.VITE_FIGMA_CLIENT_ID?.length || 0,
      nodeVersion: process.version
    }
  })
}

/**
 * Figma OAuth 2.0 인증 유틸리티
 *
 * 참고: Figma OAuth는 client_secret이 필요하므로 완전한 클라이언트 사이드 구현은 불가능합니다.
 * 프로덕션에서는 백엔드 서버가 필요합니다.
 *
 * 현재는 개발 편의를 위해 Personal Access Token 방식을 병행 지원합니다.
 */

// @ts-ignore - Vite env variables
const FIGMA_CLIENT_ID = import.meta.env?.VITE_FIGMA_CLIENT_ID || ''
// @ts-ignore - Vite env variables
const FIGMA_CLIENT_SECRET = import.meta.env?.VITE_FIGMA_CLIENT_SECRET || ''
const REDIRECT_URI = `${window.location.origin}/figflow/auth/callback`

export interface FigmaOAuthConfig {
  clientId: string
  redirectUri: string
  scope: string
}

/**
 * Figma OAuth 로그인 시작
 * 사용자를 Figma 인증 페이지로 리다이렉트합니다
 */
export function startFigmaOAuth(): void {
  if (!FIGMA_CLIENT_ID) {
    console.error('FIGMA_CLIENT_ID가 설정되지 않았습니다.')
    alert(
      'Figma OAuth가 설정되지 않았습니다.\n\n' +
      '대신 Personal Access Token을 사용하려면 취소 후 "토큰으로 로그인"을 선택하세요.\n\n' +
      '개발자: .env 파일에 VITE_FIGMA_CLIENT_ID를 설정하세요.'
    )
    return
  }

  const state = generateRandomState()
  sessionStorage.setItem('figma_oauth_state', state)

  const authUrl = buildAuthUrl({
    clientId: FIGMA_CLIENT_ID,
    redirectUri: REDIRECT_URI,
    scope: 'current_user:read file_content:read file_metadata:read',
  }, state)

  window.location.href = authUrl
}

/**
 * OAuth 인증 URL 생성
 */
function buildAuthUrl(config: FigmaOAuthConfig, state: string): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: config.scope,
    state,
    response_type: 'code',
  })

  return `https://www.figma.com/oauth?${params.toString()}`
}

/**
 * OAuth 콜백 처리 (code를 access_token으로 교환)
 *
 * ⚠️ 주의: 이 함수는 백엔드 서버가 필요합니다.
 * client_secret을 클라이언트에 노출하면 안 됩니다.
 */
export async function handleOAuthCallback(code: string, state: string): Promise<string | null> {
  // State 검증
  const savedState = sessionStorage.getItem('figma_oauth_state')
  if (state !== savedState) {
    throw new Error('State mismatch - potential CSRF attack')
  }
  sessionStorage.removeItem('figma_oauth_state')

  // 🔥 실제 구현: 백엔드 서버로 code 전송하고 access_token 받아오기
  // 현재는 클라이언트 사이드 전용이므로 직접 교환 불가

  if (!FIGMA_CLIENT_SECRET) {
    console.error('FIGMA_CLIENT_SECRET이 설정되지 않았습니다.')
    throw new Error(
      'OAuth 토큰 교환을 위해서는 백엔드 서버가 필요합니다.\n\n' +
      '개발자: 백엔드 API 엔드포인트를 구현하거나,\n' +
      'Personal Access Token 방식을 사용하세요.'
    )
  }

  try {
    // 백엔드 API 호출 예시 (실제 구현 필요)
    const response = await fetch('/api/figma/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, redirect_uri: REDIRECT_URI }),
    })

    if (!response.ok) {
      throw new Error('Failed to exchange code for token')
    }

    const data = await response.json()
    return data.access_token
  } catch (error) {
    console.error('OAuth token exchange failed:', error)
    throw error
  }
}

/**
 * URL에서 OAuth 콜백 파라미터 추출
 */
export function parseOAuthCallback(): { code: string; state: string } | null {
  const params = new URLSearchParams(window.location.search)
  const code = params.get('code')
  const state = params.get('state')

  if (!code || !state) {
    return null
  }

  return { code, state }
}

/**
 * 랜덤 state 생성 (CSRF 방지)
 */
function generateRandomState(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * OAuth 사용 가능 여부 확인
 */
export function isOAuthAvailable(): boolean {
  const available = Boolean(FIGMA_CLIENT_ID)
  console.log('[OAuth Debug] Client ID:', FIGMA_CLIENT_ID ? '설정됨' : '미설정')
  console.log('[OAuth Debug] OAuth 사용 가능:', available)
  return available
}

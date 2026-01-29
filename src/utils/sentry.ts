import * as Sentry from '@sentry/react'

/**
 * Sentry 에러 추적 초기화
 *
 * 프로덕션 환경에서만 활성화됩니다.
 * DSN은 Sentry 프로젝트 설정에서 확인할 수 있습니다.
 */
export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN

  if (!dsn) {
    console.warn('Sentry DSN not found. Error tracking disabled.')
    return
  }

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE, // 'development' or 'production'

    // 에러 샘플링 (100% 수집)
    sampleRate: 1.0,

    // 성능 모니터링 (선택적)
    tracesSampleRate: 0.1, // 10%만 수집

    // 개발 환경에서는 비활성화
    enabled: import.meta.env.PROD,

    // 추가 컨텍스트
    beforeSend(event) {
      // 민감한 정보 필터링 (필요시)
      return event
    },

    // 에러 발생 전 사용자 행동 추적
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        // 에러 발생 시에만 세션 리플레이 수집
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],

    // 세션 리플레이 샘플링
    replaysSessionSampleRate: 0, // 일반 세션은 수집 안함
    replaysOnErrorSampleRate: 1.0, // 에러 발생 시 100% 수집
  })

  console.log('Sentry initialized')
}

/**
 * 사용자 정보 설정 (Figma 로그인 후 호출)
 */
export function setSentryUser(user: { id: string; handle?: string; email?: string }) {
  Sentry.setUser({
    id: user.id,
    username: user.handle,
    email: user.email,
  })
}

/**
 * 사용자 정보 초기화 (로그아웃 시 호출)
 */
export function clearSentryUser() {
  Sentry.setUser(null)
}

/**
 * 수동 에러 리포트
 */
export function reportError(error: Error, context?: Record<string, unknown>) {
  Sentry.captureException(error, {
    extra: context,
  })
}

/**
 * 커스텀 이벤트 로깅
 */
export function logEvent(message: string, level: 'info' | 'warning' | 'error' = 'info') {
  Sentry.captureMessage(message, level)
}

export { Sentry }

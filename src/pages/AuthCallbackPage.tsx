import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { parseOAuthCallback, handleOAuthCallback } from '../utils/figmaAuth'
import { saveFigmaToken } from '../utils/figma'
import { Lightning } from '@phosphor-icons/react'
import '../styles/AuthCallbackPage.css'

function AuthCallbackPage() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const processCallback = async () => {
      try {
        const params = parseOAuthCallback()

        if (!params) {
          setStatus('error')
          setErrorMessage('OAuth 콜백 파라미터가 없습니다.')
          return
        }

        const { code, state } = params

        // Code를 access_token으로 교환
        const accessToken = await handleOAuthCallback(code, state)

        if (!accessToken) {
          setStatus('error')
          setErrorMessage('Access token을 받지 못했습니다.')
          return
        }

        // 토큰 저장
        saveFigmaToken(accessToken)

        setStatus('success')

        // 2초 후 워크스페이스로 이동
        setTimeout(() => {
          navigate('/workspace')
        }, 2000)
      } catch (error) {
        setStatus('error')
        setErrorMessage(
          error instanceof Error
            ? error.message
            : '인증 처리 중 오류가 발생했습니다.'
        )
      }
    }

    processCallback()
  }, [navigate])

  const handleManualToken = () => {
    const token = prompt(
      'Figma Personal Access Token을 입력하세요:\n\n' +
      '토큰 발급: Figma → Settings → Personal Access Tokens'
    )
    if (token) {
      saveFigmaToken(token)
      navigate('/workspace')
    }
  }

  return (
    <div className="auth-callback-page">
      <div className="auth-callback-container">
        <Lightning size={48} weight="fill" className="auth-icon" />

        {status === 'processing' && (
          <>
            <h1>Figma 연결 중...</h1>
            <div className="loading-spinner"></div>
          </>
        )}

        {status === 'success' && (
          <>
            <h1>연결 성공!</h1>
            <p>잠시 후 작업 공간으로 이동합니다...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <h1>연결 실패</h1>
            <p className="error-message">{errorMessage}</p>
            <div className="error-actions">
              <button onClick={handleManualToken} className="token-btn">
                토큰으로 로그인
              </button>
              <button onClick={() => navigate('/workspace')} className="skip-btn">
                나중에 연결하기
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default AuthCallbackPage

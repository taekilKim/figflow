import { Navigate, useLocation } from 'react-router-dom'
import { getFigmaToken } from '../utils/figma'

interface ProtectedRouteProps {
  children: React.ReactNode
}

/**
 * 인증 가드 컴포넌트
 * Figma 토큰이 없으면 랜딩페이지로 리다이렉트
 */
function ProtectedRoute({ children }: ProtectedRouteProps) {
  const location = useLocation()
  const token = getFigmaToken()

  if (!token) {
    // 토큰이 없으면 랜딩페이지로 리다이렉트
    // 원래 가려던 경로를 state에 저장
    return <Navigate to="/" state={{ from: location }} replace />
  }

  return <>{children}</>
}

export default ProtectedRoute

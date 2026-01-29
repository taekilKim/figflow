import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Users, FolderSimple, TreeStructure, GitBranch, CircleNotch } from '@phosphor-icons/react'
import { getFigmaToken, getFigmaUser, FigmaUser } from '../utils/figma'
import { getAdminStats, AdminStats, isFirebaseEnabled } from '../utils/cloudStorage'
import '../styles/AdminPage.css'

// 환경변수에서 어드민 Figma ID 목록 가져오기 (쉼표로 구분)
const ADMIN_FIGMA_IDS = (import.meta.env.VITE_ADMIN_FIGMA_IDS || '').split(',').filter(Boolean)

function AdminPage() {
  const navigate = useNavigate()
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null)
  const [currentUser, setCurrentUser] = useState<FigmaUser | null>(null)
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 권한 확인
  useEffect(() => {
    const checkAuth = async () => {
      const token = getFigmaToken()
      if (!token) {
        setIsAuthorized(false)
        setLoading(false)
        return
      }

      const user = await getFigmaUser(token)
      if (!user) {
        setIsAuthorized(false)
        setLoading(false)
        return
      }

      setCurrentUser(user)

      // 어드민 ID 목록에 포함되어 있는지 확인
      const isAdmin = ADMIN_FIGMA_IDS.includes(user.id)
      setIsAuthorized(isAdmin)

      if (isAdmin) {
        // 통계 로드
        try {
          const adminStats = await getAdminStats()
          setStats(adminStats)
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to load stats')
        }
      }

      setLoading(false)
    }

    checkAuth()
  }, [])

  // 로딩 중
  if (loading) {
    return (
      <div className="admin-page">
        <div className="admin-loading">
          <CircleNotch size={48} className="spinning" />
          <p>권한 확인 중...</p>
        </div>
      </div>
    )
  }

  // 권한 없음
  if (!isAuthorized) {
    return (
      <div className="admin-page">
        <div className="admin-unauthorized">
          <h1>접근 권한 없음</h1>
          <p>이 페이지는 관리자만 접근할 수 있습니다.</p>
          {currentUser && (
            <p className="user-info">현재 로그인: {currentUser.handle} ({currentUser.id})</p>
          )}
          <button onClick={() => navigate('/workspace')}>대시보드로 돌아가기</button>
        </div>
      </div>
    )
  }

  // Firebase 비활성화
  if (!isFirebaseEnabled()) {
    return (
      <div className="admin-page">
        <div className="admin-unauthorized">
          <h1>Firebase 비활성화</h1>
          <p>Firebase가 설정되지 않았습니다.</p>
          <button onClick={() => navigate('/workspace')}>대시보드로 돌아가기</button>
        </div>
      </div>
    )
  }

  const formatDate = (timestamp: number) => {
    if (!timestamp) return '-'
    return new Date(timestamp).toLocaleString('ko-KR')
  }

  return (
    <div className="admin-page">
      <header className="admin-header">
        <button className="back-btn" onClick={() => navigate('/workspace')}>
          <ArrowLeft size={20} />
          대시보드
        </button>
        <h1>FigFlow Admin</h1>
        <span className="admin-user">
          {currentUser?.handle}
        </span>
      </header>

      <main className="admin-content">
        {error && (
          <div className="admin-error">
            <p>{error}</p>
          </div>
        )}

        {/* 통계 카드 */}
        <section className="stats-cards">
          <div className="stat-card">
            <Users size={32} />
            <div className="stat-info">
              <span className="stat-value">{stats?.totalUsers || 0}</span>
              <span className="stat-label">총 사용자</span>
            </div>
          </div>
          <div className="stat-card">
            <FolderSimple size={32} />
            <div className="stat-info">
              <span className="stat-value">{stats?.totalProjects || 0}</span>
              <span className="stat-label">총 프로젝트</span>
            </div>
          </div>
          <div className="stat-card">
            <TreeStructure size={32} />
            <div className="stat-info">
              <span className="stat-value">{stats?.totalNodes || 0}</span>
              <span className="stat-label">총 노드</span>
            </div>
          </div>
          <div className="stat-card">
            <GitBranch size={32} />
            <div className="stat-info">
              <span className="stat-value">{stats?.totalEdges || 0}</span>
              <span className="stat-label">총 연결선</span>
            </div>
          </div>
        </section>

        {/* Sentry 테스트 */}
        <section className="sentry-test">
          <h2>Sentry 에러 추적 테스트</h2>
          <button
            className="sentry-test-btn"
            onClick={() => {
              throw new Error('Sentry 테스트 에러입니다!')
            }}
          >
            테스트 에러 발생시키기
          </button>
        </section>

        {/* 사용자 목록 */}
        <section className="users-section">
          <h2>사용자 목록</h2>
          <div className="users-table-wrapper">
            <table className="users-table">
              <thead>
                <tr>
                  <th>프로필</th>
                  <th>이름</th>
                  <th>이메일</th>
                  <th>Figma ID</th>
                  <th>프로젝트</th>
                  <th>노드</th>
                  <th>마지막 활동</th>
                </tr>
              </thead>
              <tbody>
                {stats?.users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      {user.img_url ? (
                        <img src={user.img_url} alt={user.handle} className="user-avatar" />
                      ) : (
                        <div className="user-avatar-placeholder" />
                      )}
                    </td>
                    <td>{user.handle}</td>
                    <td>{user.email || '-'}</td>
                    <td className="figma-id">{user.id}</td>
                    <td>{user.projectCount}</td>
                    <td>{user.nodeCount}</td>
                    <td>{formatDate(user.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  )
}

export default AdminPage

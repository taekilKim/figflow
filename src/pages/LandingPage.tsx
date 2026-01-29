import { useNavigate, Link } from 'react-router-dom'
import {
  Lightning,
  GitBranch,
  Sparkle,
  Check,
  FigmaLogo,
  CloudArrowUp,
  Export,
  ArrowsOutSimple,
  PencilSimple
} from '@phosphor-icons/react'
// OAuth 승인 후 사용 예정
// import { startFigmaOAuth, isOAuthAvailable } from '../utils/figmaAuth'
import { saveFigmaToken } from '../utils/figma'
import '../styles/LandingPage.css'

function LandingPage() {
  const navigate = useNavigate()

  // OAuth 승인 후 사용할 함수 (현재 베타 기간에는 토큰 방식 사용)
  // const handleOAuthLogin = () => {
  //   if (isOAuthAvailable()) {
  //     startFigmaOAuth()
  //   } else {
  //     handleTokenLogin()
  //   }
  // }

  const handleTokenLogin = () => {
    const token = prompt(
      'Figma Personal Access Token을 입력하세요:\n\n' +
      '📋 토큰 발급 방법:\n' +
      '1. Figma.com → 우측 상단 프로필 클릭\n' +
      '2. Settings → Security 탭\n' +
      '3. Personal Access Tokens → Generate new token\n\n' +
      '🔐 필요한 권한 (Scopes):\n' +
      '• File content (Read-only)\n\n' +
      '토큰 생성 후 아래에 붙여넣기 하세요:'
    )
    if (token) {
      saveFigmaToken(token)
      navigate('/workspace')
    }
  }

  return (
    <div className="landing-page">
      {/* Navigation */}
      <nav className="landing-nav">
        <div className="nav-content">
          <div className="nav-logo">
            <Lightning size={24} weight="fill" />
            <span>FigFlow</span>
          </div>
          <button className="nav-cta" onClick={handleTokenLogin}>
            <FigmaLogo size={18} weight="bold" />
            시작하기
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="hero-section">
        <div className="hero-content">
          <div className="hero-badge">
            <Sparkle size={16} weight="fill" />
            <span>Figma 플로우차트 빌더</span>
          </div>
          <h1 className="hero-title">
            복잡한 화면 흐름을
            <br />
            <span className="highlight">한눈에</span> 파악하세요
          </h1>
          <p className="hero-description">
            Figma 프레임을 불러와 플로우차트를 쉽게 만들 수 있습니다.
            디자인 핸드오프와 팀 커뮤니케이션이 쉬워집니다.
          </p>
          <div className="hero-cta">
            <button className="cta-button primary" onClick={handleTokenLogin}>
              <FigmaLogo size={20} weight="bold" />
              Figma 토큰으로 시작하기
            </button>
          </div>
          <p className="hero-notice">
            베타 기간 중에는 Personal Access Token으로 로그인합니다
          </p>
        </div>
      </header>

      {/* Demo Section */}
      <section className="demo-section">
        <div className="demo-container">
          <div className="demo-browser">
            <div className="demo-browser-bar">
              <div className="demo-dot red" />
              <div className="demo-dot yellow" />
              <div className="demo-dot green" />
              <div className="demo-url">figflow.app/flow/my-project</div>
            </div>
            <img
              src="/demo-screenshot.png"
              alt="FigFlow 데모 스크린샷"
              className="demo-image"
            />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="section-header">
          <p className="section-label">Features</p>
          <h2 className="section-title">디자인 워크플로우를 개선하세요</h2>
          <p className="section-description">
            FigFlow는 Figma 프레임을 불러와 직관적인 플로우차트를 만들 수 있게 도와줍니다.
          </p>
        </div>

        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">
              <Lightning size={28} weight="fill" />
            </div>
            <h3 className="feature-title">프레임 자동 불러오기</h3>
            <p className="feature-description">
              Figma 파일 URL만 입력하면 모든 프레임이 썸네일과 함께 자동으로 캔버스에 배치됩니다.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <PencilSimple size={28} weight="fill" />
            </div>
            <h3 className="feature-title">자유로운 편집</h3>
            <p className="feature-description">
              연결선 색상, 스타일, 라벨을 자유롭게 수정하고 프레임 위치를 드래그로 조정하세요.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <GitBranch size={28} weight="fill" />
            </div>
            <h3 className="feature-title">프리셋 시스템</h3>
            <p className="feature-description">
              자주 사용하는 연결선 스타일을 프리셋으로 저장하고 팀과 공유하세요.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <CloudArrowUp size={28} weight="fill" />
            </div>
            <h3 className="feature-title">클라우드 동기화</h3>
            <p className="feature-description">
              Figma 계정으로 로그인하면 모든 기기에서 프로젝트에 접근할 수 있습니다.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <Export size={28} weight="fill" />
            </div>
            <h3 className="feature-title">다양한 내보내기</h3>
            <p className="feature-description">
              PNG, JPG, PDF 형식으로 고해상도 이미지를 내보내 문서에 활용하세요.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <ArrowsOutSimple size={28} weight="fill" />
            </div>
            <h3 className="feature-title">무한 캔버스</h3>
            <p className="feature-description">
              확대/축소, 미니맵으로 복잡한 플로우도 쉽게 탐색하고 관리하세요.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-section">
        <div className="section-header">
          <p className="section-label">How it works</p>
          <h2 className="section-title">3단계로 시작하세요</h2>
        </div>

        <div className="steps-grid">
          <div className="step-item">
            <div className="step-number">1</div>
            <h3 className="step-title">Figma 연결</h3>
            <p className="step-description">
              Figma 계정으로 로그인하여 프로젝트에 접근 권한을 부여하세요.
            </p>
          </div>

          <div className="step-item">
            <div className="step-number">2</div>
            <h3 className="step-title">파일 불러오기</h3>
            <p className="step-description">
              Figma 파일 URL을 붙여넣으면 프레임이 자동으로 불러와집니다.
            </p>
          </div>

          <div className="step-item">
            <div className="step-number">3</div>
            <h3 className="step-title">편집 및 공유</h3>
            <p className="step-description">
              연결선을 추가/수정하고 완성된 플로우를 팀과 공유하세요.
            </p>
          </div>
        </div>
      </section>

      {/* Comparison Section */}
      <section className="comparison-section">
        <div className="section-header">
          <p className="section-label">Why FigFlow</p>
          <h2 className="section-title">기존 방식과 비교해보세요</h2>
        </div>

        <div className="comparison-grid">
          <div className="comparison-card">
            <h4 className="comparison-label other">기존 플로우차트 작성</h4>
            <ul className="comparison-list">
              <li className="comparison-item negative">수동으로 화면 캡처 필요</li>
              <li className="comparison-item negative">연결선 하나하나 직접 그리기</li>
              <li className="comparison-item negative">디자인 변경 시 처음부터 다시</li>
              <li className="comparison-item negative">별도 툴 학습 필요</li>
            </ul>
          </div>

          <div className="comparison-card highlight">
            <h4 className="comparison-label figflow">FigFlow</h4>
            <ul className="comparison-list">
              <li className="comparison-item positive">
                <Check size={20} weight="bold" />
                Figma에서 프레임 자동 추출
              </li>
              <li className="comparison-item positive">
                <Check size={20} weight="bold" />
                드래그로 쉽게 연결선 생성
              </li>
              <li className="comparison-item positive">
                <Check size={20} weight="bold" />
                동기화로 항상 최신 상태 유지
              </li>
              <li className="comparison-item positive">
                <Check size={20} weight="bold" />
                직관적인 UI, 학습 불필요
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-content">
          <h2 className="cta-title">지금 바로 시작하세요</h2>
          <p className="cta-description">
            무료로 사용할 수 있습니다. 설치 없이 브라우저에서 바로 시작하세요.
          </p>
          <button className="cta-button" onClick={handleTokenLogin}>
            <FigmaLogo size={20} weight="bold" />
            Figma 토큰으로 시작하기
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <p className="footer-text">
          Built with React Flow & Figma API
        </p>
        <Link to="/privacy" className="footer-link">개인정보처리방침</Link>
      </footer>
    </div>
  )
}

export default LandingPage

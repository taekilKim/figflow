import { useNavigate } from 'react-router-dom'
import { ArrowRight, Lightning, GitBranch, Palette, Check } from '@phosphor-icons/react'
import '../styles/LandingPage.css'

function LandingPage() {
  const navigate = useNavigate()

  const handleGetStarted = () => {
    navigate('/workspace')
  }

  return (
    <div className="landing-page">
      {/* Hero Section */}
      <header className="hero-section">
        <div className="hero-content">
          <div className="logo-title">
            <Lightning size={48} weight="fill" className="logo-icon" />
            <h1 className="brand-name">FigFlow</h1>
          </div>
          <h2 className="hero-title">
            Figma 프로토타입을 플로우차트로 자동 변환
          </h2>
          <p className="hero-description">
            복잡한 화면 흐름을 한눈에 파악하세요. <br />
            Figma 프로토타입 링크를 시각적인 플로우차트로 자동 변환합니다.
          </p>
          <button className="cta-button" onClick={handleGetStarted}>
            시작하기
            <ArrowRight size={20} weight="bold" />
          </button>
        </div>
      </header>

      {/* Features Section */}
      <section className="features-section">
        <h3 className="section-title">주요 기능</h3>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">
              <Lightning size={32} weight="fill" />
            </div>
            <h4 className="feature-title">자동 변환</h4>
            <p className="feature-description">
              Figma 프로토타입 링크만 입력하면 자동으로 플로우차트를 생성합니다.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <GitBranch size={32} weight="fill" />
            </div>
            <h4 className="feature-title">직관적인 연결선</h4>
            <p className="feature-description">
              색상, 스타일, 화살표 방향을 자유롭게 커스터마이징할 수 있습니다.
            </p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">
              <Palette size={32} weight="fill" />
            </div>
            <h4 className="feature-title">프리셋 시스템</h4>
            <p className="feature-description">
              자주 사용하는 연결선 스타일을 프리셋으로 저장하고 재사용하세요.
            </p>
          </div>
        </div>
      </section>

      {/* Comparison Section */}
      <section className="comparison-section">
        <h3 className="section-title">기존 플러그인과의 차이점</h3>
        <div className="comparison-grid">
          <div className="comparison-card">
            <h5 className="comparison-label other">기존 플로우차트 플러그인</h5>
            <ul className="comparison-list">
              <li className="comparison-item negative">수동으로 화면 캡처 필요</li>
              <li className="comparison-item negative">연결선 자동 생성 안됨</li>
              <li className="comparison-item negative">Figma 내부에서만 사용 가능</li>
              <li className="comparison-item negative">프로토타입 변경 시 수동 업데이트</li>
            </ul>
          </div>

          <div className="comparison-card highlight">
            <h5 className="comparison-label figflow">FigFlow</h5>
            <ul className="comparison-list">
              <li className="comparison-item positive">
                <Check size={20} weight="bold" />
                Figma 프로토타입 자동 추출
              </li>
              <li className="comparison-item positive">
                <Check size={20} weight="bold" />
                연결선 자동 생성 + 수동 편집
              </li>
              <li className="comparison-item positive">
                <Check size={20} weight="bold" />
                웹 브라우저에서 바로 사용
              </li>
              <li className="comparison-item positive">
                <Check size={20} weight="bold" />
                프로젝트 저장 및 버전 관리
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <h3 className="cta-title">지금 바로 시작하세요</h3>
        <p className="cta-description">
          별도의 설치 없이 웹 브라우저에서 바로 사용할 수 있습니다.
        </p>
        <button className="cta-button" onClick={handleGetStarted}>
          무료로 시작하기
          <ArrowRight size={20} weight="bold" />
        </button>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <p className="footer-text">
          Made with React Flow & Figma API
        </p>
      </footer>
    </div>
  )
}

export default LandingPage

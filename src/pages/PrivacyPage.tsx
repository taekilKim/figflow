import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from '@phosphor-icons/react'
import '../styles/PrivacyPage.css'

function PrivacyPage() {
  const navigate = useNavigate()

  return (
    <div className="privacy-page">
      <header className="privacy-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
          뒤로가기
        </button>
      </header>

      <main className="privacy-content">
        <h1>개인정보처리방침</h1>
        <p className="updated-date">최종 업데이트: 2026년 1월 29일</p>

        <section>
          <h2>1. 수집하는 정보</h2>
          <p>FigFlow는 서비스 제공을 위해 다음 정보를 수집합니다:</p>
          <ul>
            <li><strong>Figma 계정 정보:</strong> 사용자 ID, 닉네임 (핸들)</li>
            <li><strong>프로젝트 데이터:</strong> 프로젝트 이름, 프레임 이름, 연결선 정보, 레이아웃 위치</li>
          </ul>

          <h3>수집하지 않는 정보</h3>
          <p>다음 정보는 클라우드에 저장되지 않으며, 사용자의 브라우저에만 로컬로 저장됩니다:</p>
          <ul>
            <li>Figma 파일 키 (File Key)</li>
            <li>Figma 노드 ID</li>
            <li>프레임 썸네일 이미지</li>
            <li>Figma Personal Access Token</li>
          </ul>
        </section>

        <section>
          <h2>2. 정보의 사용 목적</h2>
          <ul>
            <li>클라우드 동기화를 통한 여러 기기에서의 프로젝트 접근</li>
            <li>서비스 개선 및 버그 수정</li>
          </ul>
        </section>

        <section>
          <h2>3. 정보의 보관</h2>
          <ul>
            <li><strong>로컬 저장소:</strong> Figma 토큰과 민감한 데이터는 사용자 브라우저의 localStorage에만 저장됩니다.</li>
            <li><strong>클라우드 저장소:</strong> 프로젝트 구조 정보(프레임 이름, 위치, 연결선)만 Firebase에 저장됩니다.</li>
          </ul>
        </section>

        <section>
          <h2>4. 정보의 삭제</h2>
          <ul>
            <li>로그아웃 시 브라우저의 로컬 데이터가 삭제됩니다.</li>
            <li>프로젝트 삭제 시 클라우드의 해당 프로젝트 데이터가 삭제됩니다.</li>
            <li>계정 삭제를 원하시면 문의해 주세요.</li>
          </ul>
        </section>

        <section>
          <h2>5. 제3자 서비스</h2>
          <ul>
            <li><strong>Firebase (Google):</strong> 클라우드 데이터 저장</li>
            <li><strong>Figma API:</strong> 프레임 정보 및 썸네일 조회 (사용자 브라우저에서 직접 요청)</li>
            <li><strong>Vercel:</strong> 웹 호스팅</li>
          </ul>
        </section>

        <section>
          <h2>6. 문의</h2>
          <p>개인정보 관련 문의는 카카오톡 오픈채팅을 통해 연락해 주세요.</p>
          <a href="https://open.kakao.com/o/gBug0Qdi" target="_blank" rel="noopener noreferrer" className="contact-link">
            카카오톡 오픈채팅 문의하기
          </a>
        </section>
      </main>
    </div>
  )
}

export default PrivacyPage

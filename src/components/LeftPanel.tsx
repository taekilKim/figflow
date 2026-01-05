import { useState } from 'react'
import '../styles/LeftPanel.css'

function LeftPanel() {
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <div className="left-panel">
      <div className="panel-header">
        <h2>프레임 목록</h2>
      </div>

      <div className="search-bar">
        <input
          type="text"
          placeholder="프레임 검색..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
      </div>

      <div className="panel-content">
        <div className="empty-state">
          <p>아직 추가된 프레임이 없습니다.</p>
          <p className="empty-state-hint">
            Figma 프레임을 추가하려면<br />
            상단의 "프레임 추가" 버튼을 클릭하세요.
          </p>
        </div>
      </div>
    </div>
  )
}

export default LeftPanel

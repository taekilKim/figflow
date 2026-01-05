import '../styles/RightPanel.css'

interface RightPanelProps {
  selectedNodeId: string | null
  selectedEdgeId: string | null
}

function RightPanel({ selectedNodeId, selectedEdgeId }: RightPanelProps) {
  if (!selectedNodeId && !selectedEdgeId) {
    return (
      <div className="right-panel">
        <div className="panel-header">
          <h2>속성</h2>
        </div>
        <div className="panel-content">
          <div className="empty-state">
            <p>선택된 항목이 없습니다.</p>
            <p className="empty-state-hint">
              노드 또는 연결선을 선택하면<br />
              속성을 편집할 수 있습니다.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="right-panel">
      <div className="panel-header">
        <h2>속성</h2>
      </div>
      <div className="panel-content">
        {selectedNodeId && (
          <div className="inspector-section">
            <h3 className="inspector-title">노드 정보</h3>
            <div className="inspector-field">
              <label>제목</label>
              <input type="text" placeholder="프레임 제목" />
            </div>
            <div className="inspector-field">
              <label>상태</label>
              <select>
                <option value="draft">초안</option>
                <option value="review">검토 중</option>
                <option value="approved">승인됨</option>
                <option value="deprecated">사용 중지</option>
              </select>
            </div>
            <div className="inspector-field">
              <label>메모</label>
              <textarea rows={4} placeholder="메모를 입력하세요..." />
            </div>
          </div>
        )}

        {selectedEdgeId && (
          <div className="inspector-section">
            <h3 className="inspector-title">연결선 정보</h3>
            <div className="inspector-field">
              <label>라벨</label>
              <input type="text" placeholder="연결선 라벨" />
            </div>
            <div className="inspector-field">
              <label>소스 타입</label>
              <select>
                <option value="auto">자동 (Figma 프로토타입)</option>
                <option value="inferred">추론</option>
                <option value="manual">수동</option>
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default RightPanel

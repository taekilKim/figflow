import { useReactFlow } from '@xyflow/react'
import { Plus, Minus, FrameCorners, Selection } from '@phosphor-icons/react'
import { Tooltip } from 'react-tooltip'
import 'react-tooltip/dist/react-tooltip.css'
import '../styles/TDSControls.css'

/**
 * TDSControls: Atomic Custom Controls
 *
 * 설계 원칙:
 * 1. React Flow 기본 Controls 제거하고 TDS 스타일로 재구현
 * 2. 모든 버튼에 Tooltip 제공 (사용자 경험 향상)
 * 3. TDS 디자인 원칙: 둥근 모서리, 그림자, 호버 효과
 * 4. Phosphor Icons 사용으로 시각적 일관성 유지
 */

interface TDSControlsProps {
  style?: React.CSSProperties
}

export default function TDSControls({ style }: TDSControlsProps) {
  const { zoomIn, zoomOut, fitView, zoomTo, getNodes } = useReactFlow()

  const handleZoomIn = () => {
    zoomIn({ duration: 400 })
  }

  const handleZoomOut = () => {
    zoomOut({ duration: 400 })
  }

  // 🔥 [System Bible v2.0] Ctrl+1과 동일한 동작: 100% 줌
  const handleFitView = () => {
    zoomTo(1, { duration: 800 })
  }

  // 🔥 [System Bible v2.0] Ctrl+2와 동일한 동작: 선택된 노드들로 핏
  const handleFitSelection = () => {
    const selectedNodes = getNodes().filter((n) => n.selected)
    if (selectedNodes.length > 0) {
      fitView({ nodes: selectedNodes, padding: 0.2, duration: 800 })
    }
  }

  return (
    <>
      <div className="tds-controls" style={style}>
        {/* Zoom In */}
        <button
          className="tds-control-button"
          onClick={handleZoomIn}
          data-tooltip-id="tds-tooltip"
          data-tooltip-content="확대 (Zoom In)"
          aria-label="확대"
        >
          <Plus size={20} weight="bold" />
        </button>

        {/* Zoom Out */}
        <button
          className="tds-control-button"
          onClick={handleZoomOut}
          data-tooltip-id="tds-tooltip"
          data-tooltip-content="축소 (Zoom Out)"
          aria-label="축소"
        >
          <Minus size={20} weight="bold" />
        </button>

        <div className="tds-control-divider" />

        {/* Fit View (전체 화면) */}
        <button
          className="tds-control-button"
          onClick={handleFitView}
          data-tooltip-id="tds-tooltip"
          data-tooltip-content="전체 보기 (Ctrl+1 / Cmd+1)"
          aria-label="전체 보기"
        >
          <FrameCorners size={20} weight="bold" />
        </button>

        {/* Fit Selection (선택 요소에 맞추기) */}
        <button
          className="tds-control-button"
          onClick={handleFitSelection}
          data-tooltip-id="tds-tooltip"
          data-tooltip-content="선택 요소 보기 (Ctrl+2 / Cmd+2)"
          aria-label="선택 요소 보기"
        >
          <Selection size={20} weight="bold" />
        </button>
      </div>

      {/* TDS Dark Theme Tooltip */}
      <Tooltip
        id="tds-tooltip"
        place="right"
        className="tds-tooltip"
        style={{
          backgroundColor: '#191F28',
          color: '#FFFFFF',
          borderRadius: '8px',
          padding: '8px 12px',
          fontSize: '13px',
          fontWeight: 600,
          letterSpacing: 0,
          fontFamily: "'Pretendard Variable', Pretendard, sans-serif",
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          zIndex: 10000,
        }}
      />
    </>
  )
}

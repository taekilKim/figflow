import { memo } from 'react'
import {
  BaseEdge,
  EdgeLabelRenderer,
  EdgeProps,
  getSmoothStepPath,
  useViewport,
} from '@xyflow/react'

/**
 * TDSStepEdge: Simplified Native Step Edge with Edge Updater Handles
 *
 * 🔥 Pivot: Smart Routing 완전 제거
 * - @tisoap/react-flow-smart-edge 폐기
 * - React Flow 내장 getSmoothStepPath 사용
 * - offset: 50 (프레임에서 50px 직선 브레이크아웃)
 * - borderRadius: 20 (부드러운 직각)
 *
 * 🔥 Fix: EdgeUpdater 핸들 추가
 * - BaseEdge는 핸들을 렌더링하지 않음
 * - SVG circle 요소로 직접 핸들 구현
 *
 * 장점:
 * - 갭 없음 (Native는 원래 핸들에 딱 붙음)
 * - 예측 가능한 동작
 * - 화살표 자동 렌더링
 * - 안정성 극대화
 */
function TDSStepEdge(props: EdgeProps) {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    markerEnd,
    markerStart,
    label,
    selected,
  } = props

  // 🔥 [Fix] 줌 레벨에 따라 핸들 크기 동적 조정
  const { zoom } = useViewport()
  const scale = zoom < 1 ? (1 / zoom) : 1
  const handleRadius = 5 * scale

  // 🔥 [Final Fix] Native Step Path with Direction Calculation
  // offset: 2 → 최소 직선 구간 확보 (방향 계산용) + 밀착 효과 유지
  // borderRadius: 0 → 완전한 직각
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 0,  // 🔥 Final: 직각 유지
    offset: 2,        // 🔥 [Fix] 0 -> 2px (방향 계산을 위한 최소 구간 확보 + 밀착 효과 유지)
  })

  // 라벨 색상 로직 (프리셋 적용)
  const edgeColor = style?.stroke as string | undefined
  const isDefaultColor = !edgeColor || edgeColor === '#555555' || edgeColor === '#555'
  const labelBg = isDefaultColor ? '#FFFFFF' : edgeColor
  const labelColor = isDefaultColor ? '#333D4B' : '#FFFFFF'
  const labelBorder = isDefaultColor ? '1px solid #E5E8EB' : 'none'

  return (
    <>
      {/* 🔥 BaseEdge: markerEnd 반드시 전달 (화살표 렌더링 핵심) */}
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        markerStart={markerStart}
        style={style}
      />

      {/* 🔥 [Fix] EdgeUpdater 핸들 직접 렌더링 (줌 반응형) */}
      {selected && (
        <>
          <circle
            cx={sourceX}
            cy={sourceY}
            r={handleRadius}
            className="react-flow__edgeupdater react-flow__edgeupdater-source"
            style={{
              fill: '#ffffff',
              stroke: '#3182F6',
              strokeWidth: 2 * scale,
              cursor: 'grab',
            }}
          />
          <circle
            cx={targetX}
            cy={targetY}
            r={handleRadius}
            className="react-flow__edgeupdater react-flow__edgeupdater-target"
            style={{
              fill: '#ffffff',
              stroke: '#3182F6',
              strokeWidth: 2 * scale,
              cursor: 'grab',
            }}
          />
        </>
      )}

      {/* TDS 스타일 라벨 */}
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              transformOrigin: 'center',
              pointerEvents: 'all',
              zIndex: 1000,
            }}
            className="nodrag nopan"
          >
            <div
              className="tds-edge-label"
              style={{
                backgroundColor: labelBg,
                color: labelColor,
                border: labelBorder,
                padding: '4px 8px',
                borderRadius: '6px',
                fontWeight: 600,
                letterSpacing: 0,
                fontFamily: "'Pretendard Variable', Pretendard, sans-serif",
                boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap',
              }}
            >
              {label}
            </div>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}

export default memo(TDSStepEdge)

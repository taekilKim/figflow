import { memo } from 'react'
import {
  BaseEdge,
  EdgeLabelRenderer,
  EdgeProps,
  getSmoothStepPath,
} from '@xyflow/react'

/**
 * TDSStepEdge: Simplified Native Step Edge
 *
 * 🔥 Pivot: Smart Routing 완전 제거
 * - @tisoap/react-flow-smart-edge 폐기
 * - React Flow 내장 getSmoothStepPath 사용
 * - offset: 50 (프레임에서 50px 직선 브레이크아웃)
 * - borderRadius: 20 (부드러운 직각)
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
  } = props

  // 🔥 [Final] Native Step Path - Zero Gap (offset: 0)
  // offset: 0 → 핸들에 완전히 밀착 (갭 제거)
  // borderRadius: 0 → 완전한 직각
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 0,  // 🔥 Final: 직각 유지
    offset: 0,        // 🔥 Final: 갭 제거
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
              style={{
                backgroundColor: labelBg,
                color: labelColor,
                border: labelBorder,
                padding: '4px 8px',
                borderRadius: '6px',
                fontSize: '11px',
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

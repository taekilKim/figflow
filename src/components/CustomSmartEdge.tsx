import { memo } from 'react'
import {
  BaseEdge,
  EdgeLabelRenderer,
  EdgeProps,
  getSmoothStepPath,
} from '@xyflow/react'

/**
 * CustomSmartEdge: Fail-Safe Step Edge with Forced Label Rendering
 *
 * 전략: 무조건 직각 경로(Step) 사용, 곡선 절대 금지
 * 라벨: EdgeLabelRenderer로 강제 렌더링
 */
function CustomSmartEdge(props: EdgeProps) {
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

  // 🔥 Fail-Safe: 무조건 직각 경로 사용 (borderRadius: 0 = 완전 직각)
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 0,  // 🔥 완전 직각 (곡선 제거)
    offset: 50,       // 핸들에서 50px 직선 진행 후 꺾임
  })

  return (
    <>
      {/* 엣지 경로 렌더링 */}
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        markerStart={markerStart}
        style={style}
      />

      {/* 🔥 라벨 강제 렌더링 (사라진 라벨 복구) */}
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'all',
              zIndex: 1000,
            }}
            className="nodrag nopan"
          >
            <div
              style={{
                background: '#F2F4F6',
                padding: '4px 8px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                color: '#333D4B',
                fontFamily: "'Pretendard Variable', Pretendard, sans-serif",
                letterSpacing: 0,
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

export default memo(CustomSmartEdge)

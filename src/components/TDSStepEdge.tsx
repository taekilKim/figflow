import { memo } from 'react'
import {
  BaseEdge,
  EdgeLabelRenderer,
  EdgeProps,
  getSmoothStepPath,
} from '@xyflow/react'

/**
 * TDSStepEdge: Simplified Native Step Edge with TDS Label Styling
 *
 * 🔥 Pivot: Smart Routing 완전 제거
 * - @tisoap/react-flow-smart-edge 폐기
 * - React Flow 내장 getSmoothStepPath 사용
 * - offset: 2 (최소 직선 구간 + 밀착 효과)
 * - borderRadius: 0 (완전한 직각)
 *
 * 🔥 Fix: EdgeUpdater는 React Flow가 자동 렌더링
 * - updatable: true 설정 시 ReactFlow가 자동으로 edgeupdater button 생성
 * - CSS로 스타일링 (global.css의 .react-flow__edgeupdater)
 * - 드래그 기능은 React Flow 내부 시스템이 처리
 *
 * 장점:
 * - 갭 없음 (Native는 원래 핸들에 딱 붙음)
 * - 예측 가능한 동작
 * - 화살표 자동 렌더링
 * - TDS 라벨 스타일 (색상별 배경/텍스트)
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
      {/* BaseEdge: React Flow 표준 edge 렌더링 */}
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        markerStart={markerStart}
        style={style}
        interactionWidth={20}
      />

      {/* EdgeUpdater 핸들: foreignObject로 button 렌더링 */}
      {selected && (
        <>
          <foreignObject
            width={40}
            height={40}
            x={sourceX - 20}
            y={sourceY - 20}
            className="react-flow__edgeupdater-container"
            requiredExtensions="http://www.w3.org/1999/xhtml"
          >
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <button
                className="react-flow__edgeupdater react-flow__edgeupdater-source"
                type="button"
              />
            </div>
          </foreignObject>
          <foreignObject
            width={40}
            height={40}
            x={targetX - 20}
            y={targetY - 20}
            className="react-flow__edgeupdater-container"
            requiredExtensions="http://www.w3.org/1999/xhtml"
          >
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <button
                className="react-flow__edgeupdater react-flow__edgeupdater-target"
                type="button"
              />
            </div>
          </foreignObject>
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

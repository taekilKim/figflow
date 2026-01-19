import { memo } from 'react'
import {
  BaseEdge,
  EdgeLabelRenderer,
  EdgeProps,
  getSmoothStepPath,
} from '@xyflow/react'

/**
 * TDSStepEdge: Native Step Edge with TDS Label Styling
 *
 * 🔥 Architecture:
 * - React Flow 내장 getSmoothStepPath 사용
 * - offset: 2 (최소 직선 구간 + 밀착 효과)
 * - borderRadius: 0 (완전한 직각)
 *
 * 🔥 EdgeUpdater (재연결 핸들):
 * - React Flow가 자동 렌더링 (updatable: true + onReconnect 필수)
 * - CSS로 제어 (global.css의 .react-flow__edge.selected .react-flow__edgeupdater)
 * - 선택된 엣지에만 표시, 줌 레벨에 따라 동적 크기 조정
 * - 드래그 기능은 React Flow 내부 시스템이 자동 처리
 *
 * 🔥 TDS Label Styling:
 * - EdgeLabelRenderer로 HTML 기반 라벨 렌더링
 * - 색상별 배경/텍스트 (기본: 흰배경/어두운텍스트, 커스텀: 색배경/흰텍스트)
 * - 동적 폰트 크기 (줌 레벨 반영)
 *
 * 장점:
 * - React Flow 네이티브 시스템 활용 → 안정성 극대화
 * - 핸들 드래그/재연결 자동 작동
 * - 화살표 자동 렌더링
 * - 갭 없이 핸들에 딱 붙는 엣지
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

  // 🔥 [Final Fix] Native Step Path with Direction Calculation
  // offset: 25 → 수직/수평으로 일정 구간 진행 후 꺾임 (프레임에 바로 붙지 않음)
  // borderRadius: 0 → 완전한 직각
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 0,  // 🔥 Final: 직각 유지
    offset: 25,       // 🔥 Update: 2 -> 25px (수직/수평 구간 확보, 프레임에 바로 붙지 않음)
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

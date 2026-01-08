import { memo } from 'react'
import {
  BaseEdge,
  EdgeLabelRenderer,
  EdgeProps,
  useNodes,
  useViewport,
} from '@xyflow/react'
import { getSmartEdge } from '@tisoap/react-flow-smart-edge'

/**
 * CustomSmartEdge: Smart Routing with Path Patching
 *
 * 전략:
 * 1. getSmartEdge로 장애물 회피 경로 계산 (nodePadding 적용)
 * 2. Path Patching으로 핸들-경로 간 갭 제거
 * 3. EdgeLabelRenderer로 HTML 라벨 렌더링 (TDS 스타일)
 * 4. 동적 줌 스케일 적용으로 라벨 가시성 유지
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
    data,
  } = props

  const nodes = useNodes()
  const { zoom } = useViewport()

  // 줌 아웃 시 라벨 크기 증가 (화면상 크기 유지)
  const labelScale = zoom < 1 ? 1 / zoom : 1

  // 1. 스마트 경로 계산 (장애물 회피)
  const edgeData = data as any
  const smartEdgeResult = getSmartEdge({
    sourcePosition,
    targetPosition,
    sourceX,
    sourceY,
    targetX,
    targetY,
    nodes,
    options: {
      nodePadding: edgeData?.smartEdge?.nodePadding || 80,
      gridRatio: edgeData?.smartEdge?.gridRatio || 10,
    } as any,
  })

  // getSmartEdge가 경로를 찾지 못한 경우 (드물지만 가능)
  // Error 객체이거나 결과가 없거나 svgPath가 없는 경우 폴백
  if (!smartEdgeResult || smartEdgeResult instanceof Error || !(smartEdgeResult as any).svgPath) {
    // Fallback: 직선 경로
    const fallbackPath = `M ${sourceX},${sourceY} L ${targetX},${targetY}`
    return (
      <>
        <BaseEdge
          id={id}
          path={fallbackPath}
          markerEnd={markerEnd}
          markerStart={markerStart}
          style={style}
        />
        {label && (
          <EdgeLabelRenderer>
            <div
              style={{
                position: 'absolute',
                transform: `translate(-50%, -50%) translate(${(sourceX + targetX) / 2}px, ${(sourceY + targetY) / 2}px) scale(${labelScale})`,
                pointerEvents: 'all',
                zIndex: 1000,
              }}
              className="nodrag nopan tds-edge-label"
            >
              {label}
            </div>
          </EdgeLabelRenderer>
        )}
      </>
    )
  }

  const { svgPath, edgeCenterX, edgeCenterY } = smartEdgeResult as any

  // 2. Path Patching: 핸들-경로 간 갭 제거
  // SVG path는 "M x,y L x2,y2 ..." 형식
  // svgPath의 시작점이 sourceX, sourceY와 다르면 연결선 추가

  // 🔥 안전성 검사: svgPath가 문자열인지 확인
  if (!svgPath || typeof svgPath !== 'string') {
    const fallbackPath = `M ${sourceX},${sourceY} L ${targetX},${targetY}`
    return (
      <>
        <BaseEdge
          id={id}
          path={fallbackPath}
          markerEnd={markerEnd}
          markerStart={markerStart}
          style={style}
        />
        {label && (
          <EdgeLabelRenderer>
            <div
              style={{
                position: 'absolute',
                transform: `translate(-50%, -50%) translate(${(sourceX + targetX) / 2}px, ${(sourceY + targetY) / 2}px) scale(${labelScale})`,
                pointerEvents: 'all',
                zIndex: 1000,
              }}
              className="nodrag nopan tds-edge-label"
            >
              {label}
            </div>
          </EdgeLabelRenderer>
        )}
      </>
    )
  }

  // SVG path에서 시작점 추출
  const pathMatch = svgPath.match(/^M\s*([\d.]+)[,\s]+([\d.]+)/)
  let patchedPath = svgPath

  if (pathMatch) {
    const pathStartX = parseFloat(pathMatch[1])
    const pathStartY = parseFloat(pathMatch[2])

    // 시작점이 핸들 위치와 다르면 (5px 이상 차이) 연결선 추가
    const startGap = Math.hypot(pathStartX - sourceX, pathStartY - sourceY)
    if (startGap > 5) {
      // "M sourceX,sourceY L pathStartX,pathStartY" + 나머지 경로
      patchedPath = `M ${sourceX},${sourceY} L ${pathStartX},${pathStartY} ` + svgPath.substring(pathMatch[0].length)
    }

    // 끝점 패칭은 복잡하므로 (path 끝부분 파싱 필요), 시작점만 패치
    // 대부분의 경우 시작점 패칭만으로도 충분함 (nodePadding이 양쪽에 적용되므로)
  }

  return (
    <>
      {/* 엣지 경로 렌더링 */}
      <BaseEdge
        id={id}
        path={patchedPath}
        markerEnd={markerEnd}
        markerStart={markerStart}
        style={style}
      />

      {/* 라벨 렌더링 (HTML + TDS 스타일 + 동적 스케일) */}
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${edgeCenterX}px, ${edgeCenterY}px) scale(${labelScale})`,
              transformOrigin: 'center',
              pointerEvents: 'all',
              zIndex: 1000,
            }}
            className="nodrag nopan tds-edge-label"
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}

export default memo(CustomSmartEdge)

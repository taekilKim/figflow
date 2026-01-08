import { EdgeProps, useNodes, getSmoothStepPath } from '@xyflow/react'
import { getSmartEdge } from '@tisoap/react-flow-smart-edge'

/**
 * CustomSmartEdge: "Path Patching" 기법으로 갭 제거
 *
 * 문제: SmartStepEdge의 nodePadding은 핸들에서 떨어진 곳에서 경로를 시작하여 갭을 만듦
 * 해결: 핸들 -> 경로 시작점, 경로 끝점 -> 핸들을 직선(L)으로 강제 연결
 *
 * 결과: Touch (핸들에 붙음) + Breakout (직선 구간) + Avoidance (장애물 회피)
 */
export default function CustomSmartEdge(props: EdgeProps) {
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
    data,
  } = props

  const nodes = useNodes()

  // SmartStepEdge 설정 추출
  const smartEdgeOptions = data?.smartEdge || {
    nodePadding: 80,
    gridRatio: 10,
    lessCorners: true,
  }

  // getSmartEdge로 스마트 경로 계산
  const smartResult = getSmartEdge({
    sourcePosition,
    targetPosition,
    sourceX,
    sourceY,
    targetX,
    targetY,
    nodes,
    options: smartEdgeOptions,
  })

  // getSmartEdge가 null/Error를 반환하면 fallback으로 기본 Step Edge 사용
  if (!smartResult || smartResult instanceof Error) {
    const [fallbackPath] = getSmoothStepPath({
      sourceX,
      sourceY,
      targetX,
      targetY,
      sourcePosition,
      targetPosition,
    })
    return (
      <path
        id={id}
        className="react-flow__edge-path"
        d={fallbackPath}
        style={style}
        markerEnd={markerEnd}
        markerStart={markerStart}
      />
    )
  }

  // 🔥 Path Patching: 핸들과 경로를 직선으로 연결
  // getSmartEdge는 string 또는 { svgPathString: string } 반환
  const svgPathString = typeof smartResult === 'string'
    ? smartResult
    : (smartResult as any).svgPathString

  if (typeof svgPathString !== 'string') {
    // Fallback
    const [fallbackPath] = getSmoothStepPath({
      sourceX,
      sourceY,
      targetX,
      targetY,
      sourcePosition,
      targetPosition,
    })
    return (
      <path
        id={id}
        className="react-flow__edge-path"
        d={fallbackPath}
        style={style}
        markerEnd={markerEnd}
        markerStart={markerStart}
      />
    )
  }

  // SVG Path 파싱: "M x y L ..." 형태
  // 첫 번째 M 명령의 좌표를 추출
  const pathMatch = svgPathString.match(/M\s*([\d.]+)\s+([\d.]+)/)
  if (!pathMatch) {
    // 파싱 실패 시 원본 경로 사용
    return (
      <path
        id={id}
        className="react-flow__edge-path"
        d={svgPathString}
        style={style}
        markerEnd={markerEnd}
        markerStart={markerStart}
      />
    )
  }

  const smartStartX = parseFloat(pathMatch[1])
  const smartStartY = parseFloat(pathMatch[2])

  // 🔥 Bridged Path 생성:
  // "M sourceX sourceY L smartStartX smartStartY [원본 경로 나머지] L targetX targetY"
  const remainingPath = svgPathString.substring(pathMatch[0].length) // "M x y" 제거
  const bridgedPath = `M ${sourceX} ${sourceY} L ${smartStartX} ${smartStartY}${remainingPath} L ${targetX} ${targetY}`

  return (
    <path
      id={id}
      className="react-flow__edge-path"
      d={bridgedPath}
      style={style}
      markerEnd={markerEnd}
      markerStart={markerStart}
    />
  )
}

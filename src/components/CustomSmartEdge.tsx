import { memo, useState, useEffect } from 'react'
import {
  BaseEdge,
  EdgeLabelRenderer,
  EdgeProps,
  useNodes,
  getSmoothStepPath,
} from '@xyflow/react'
import { getSmartEdge } from '@tisoap/react-flow-smart-edge'

/**
 * CustomSmartEdge: The Bridge Strategy
 *
 * 핵심 전략:
 * 1. nodePadding: 80으로 장애물 회피 경로 계산 (갭 발생)
 * 2. Path Patching으로 핸들-경로 간 갭을 직선(Bridge)으로 연결
 * 3. 결과: 딱 붙음 + 80px 직진 + 회피
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

  const nodes = useNodes()
  const [edgePath, setEdgePath] = useState('')
  const [labelPos, setLabelPos] = useState({ x: 0, y: 0 })

  useEffect(() => {
    let isMounted = true

    // 1. 노드 치수 보정 (Dimension Injection)
    // 회피가 안 되는 이유: width/height가 0이면 투명인간 취급
    // 기본값 강제 할당으로 회피 구역 생성
    const nodesWithDims = nodes.map((node) => ({
      ...node,
      width: node.measured?.width ?? node.width ?? 375,
      height: node.measured?.height ?? node.height ?? 600,
      position: node.position,
    }))

    const calculatePath = async () => {
      try {
        const smartResult = await getSmartEdge({
          sourceX,
          sourceY,
          targetX,
          targetY,
          sourcePosition,
          targetPosition,
          nodes: nodesWithDims,
          options: {
            nodePadding: 80, // 회피 거리 겸 오프셋 거리
            gridRatio: 10,
          } as any,
        })

        if (!isMounted) return

        if (smartResult && !(smartResult instanceof Error)) {
          const { svgPath, edgeCenterX, edgeCenterY } = smartResult as any

          // 🔥 [핵심 로직] Path Patching (The Bridge)
          // svgPath는 "M startX,startY ..."로 시작 (핸들과 떨어져 있음)
          // 이를 "M sourceX,sourceY L startX,startY ..."로 개조하여 갭을 직선으로 이음

          // SVG path에서 첫 M 명령의 좌표 추출
          const pathMatch = svgPath.match(/^M\s*([\d.]+)[,\s]+([\d.]+)/)
          let patchedPath = svgPath

          if (pathMatch) {
            const pathStartX = parseFloat(pathMatch[1])
            const pathStartY = parseFloat(pathMatch[2])

            // 핸들에서 경로 시작점까지 직선 연결
            patchedPath = `M ${sourceX},${sourceY} L ${pathStartX},${pathStartY}` + svgPath.substring(pathMatch[0].length)
          }

          setEdgePath(patchedPath)
          setLabelPos({ x: edgeCenterX, y: edgeCenterY })
        } else {
          throw new Error('No path found')
        }
      } catch (e) {
        if (!isMounted) return

        // Fallback: 내장 Step 경로
        const [fallbackPath, lx, ly] = getSmoothStepPath({
          sourceX,
          sourceY,
          sourcePosition,
          targetX,
          targetY,
          targetPosition,
          borderRadius: 0,
          offset: 50,
        })
        setEdgePath(fallbackPath)
        setLabelPos({ x: lx, y: ly })
      }
    }

    calculatePath()

    return () => {
      isMounted = false
    }
  }, [sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, nodes])

  // 초기 렌더링 시 깜빡임 방지를 위한 Fallback
  if (!edgePath) {
    const [tempPath] = getSmoothStepPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
      borderRadius: 0,
      offset: 50,
    })
    return <BaseEdge id={id} path={tempPath} markerEnd={markerEnd} style={style} />
  }

  // 라벨 색상 로직 (프리셋 적용)
  const edgeColor = style?.stroke as string | undefined
  const isDefaultColor = !edgeColor || edgeColor === '#555555' || edgeColor === '#555'
  const labelBg = isDefaultColor ? '#FFFFFF' : edgeColor
  const labelColor = isDefaultColor ? '#333D4B' : '#FFFFFF'
  const labelBorder = isDefaultColor ? '1px solid #E5E8EB' : 'none'

  return (
    <>
      <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} markerStart={markerStart} style={style} />
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelPos.x}px, ${labelPos.y}px)`,
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

export default memo(CustomSmartEdge)

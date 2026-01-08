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
 * CustomSmartEdge: Manual Coordinate Bridge
 *
 * 전략:
 * 1. nodePadding: 80으로 장애물 회피 경로 계산
 * 2. 정규식으로 경로 시작점 좌표 추출
 * 3. M sourceX,sourceY L startX,startY + 나머지 경로 + L targetX,targetY
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
  const [smartPath, setSmartPath] = useState('')
  const [labelPos, setLabelPos] = useState({ x: 0, y: 0 })

  useEffect(() => {
    let isMounted = true

    // 1. 노드 치수 주입 (Avoidance 필수)
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
            nodePadding: 80, // 회피/오프셋 거리
            gridRatio: 10,
          } as any,
        })

        if (!isMounted) return

        if (smartResult && !(smartResult instanceof Error)) {
          const { svgPath, edgeCenterX, edgeCenterY } = smartResult as any

          // 🔥 [Manual Bridge Logic]
          // 정규식으로 시작점 좌표 추출
          const matchStart = svgPath.match(/^M\s*([-\d.]+)[,\s]+([-\d.]+)/)

          if (matchStart) {
            const startX = parseFloat(matchStart[1])
            const startY = parseFloat(matchStart[2])

            // Bridge Path 생성: Source -> SmartPathStart
            const bridgeStart = `M ${sourceX},${sourceY} L ${startX},${startY}`
            // 원본 경로의 M 명령 제거하고 이어붙이기
            const restPath = svgPath.substring(matchStart[0].length)
            // Target까지 직선 추가
            const fullPath = `${bridgeStart}${restPath} L ${targetX},${targetY}`

            setSmartPath(fullPath)
          } else {
            // 파싱 실패 시 원본 사용
            setSmartPath(svgPath)
          }

          setLabelPos({ x: edgeCenterX, y: edgeCenterY })
        } else {
          throw new Error('No path')
        }
      } catch (e) {
        if (!isMounted) return

        // Fallback: Native Step Path (직각)
        const [fallback, lx, ly] = getSmoothStepPath({
          sourceX,
          sourceY,
          sourcePosition,
          targetX,
          targetY,
          targetPosition,
          borderRadius: 0,
          offset: 50,
        })
        setSmartPath(fallback)
        setLabelPos({ x: lx, y: ly })
      }
    }

    calculatePath()
    return () => {
      isMounted = false
    }
  }, [sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, nodes])

  // 초기 렌더링 시 깜빡임 방지
  if (!smartPath) {
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
      <BaseEdge id={id} path={smartPath} markerEnd={markerEnd} markerStart={markerStart} style={style} />
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

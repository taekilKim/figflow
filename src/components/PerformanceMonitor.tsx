import { useEffect, useState } from 'react'
import { useNodes, useEdges, useViewport } from '@xyflow/react'

/**
 * 성능 모니터링 컴포넌트
 *
 * 개발 모드에서만 표시되며, 다음 정보를 실시간으로 표시:
 * - FPS (Frames Per Second)
 * - 노드 수
 * - 엣지 수
 * - 현재 줌 레벨
 * - 성능 상태 (좋음/보통/나쁨)
 *
 * 성능 기준:
 * - FPS >= 50: 좋음 (녹색)
 * - FPS >= 30: 보통 (노란색)
 * - FPS < 30: 나쁨 (빨간색)
 */
export function PerformanceMonitor() {
  const [fps, setFps] = useState(60)
  const nodes = useNodes()
  const edges = useEdges()
  const { zoom } = useViewport()

  // FPS 측정
  useEffect(() => {
    let frameCount = 0
    let lastTime = performance.now()
    let animationFrameId: number

    const measureFps = () => {
      frameCount++
      const currentTime = performance.now()

      if (currentTime >= lastTime + 1000) {
        setFps(frameCount)
        frameCount = 0
        lastTime = currentTime
      }

      animationFrameId = requestAnimationFrame(measureFps)
    }

    animationFrameId = requestAnimationFrame(measureFps)

    return () => {
      cancelAnimationFrame(animationFrameId)
    }
  }, [])

  // 성능 상태 계산
  const getPerformanceStatus = () => {
    if (fps >= 50) return { label: '✅ GOOD', color: '#10b981' }
    if (fps >= 30) return { label: '⚡ OK', color: '#f59e0b' }
    return { label: '⚠️ LAG', color: '#ef4444' }
  }

  const status = getPerformanceStatus()

  // 개발 모드가 아니면 렌더링하지 않음
  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 80,
        right: 10,
        background: 'rgba(0, 0, 0, 0.85)',
        color: '#fff',
        padding: '12px 16px',
        borderRadius: 8,
        fontSize: 13,
        fontFamily: "'Menlo', 'Monaco', 'Courier New', monospace",
        zIndex: 10000,
        minWidth: 180,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        backdropFilter: 'blur(10px)',
      }}
    >
      <div style={{ marginBottom: 8, fontWeight: 'bold', fontSize: 14, color: '#60a5fa' }}>
        ⚡ Performance
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#9ca3af' }}>FPS:</span>
          <span style={{ fontWeight: 'bold', fontSize: 16 }}>{fps}</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#9ca3af' }}>Nodes:</span>
          <span>{nodes.length}</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#9ca3af' }}>Edges:</span>
          <span>{edges.length}</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#9ca3af' }}>Zoom:</span>
          <span>{(zoom * 100).toFixed(0)}%</span>
        </div>

        <div
          style={{
            marginTop: 8,
            paddingTop: 8,
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            textAlign: 'center',
            fontWeight: 'bold',
            fontSize: 14,
            color: status.color,
          }}
        >
          {status.label}
        </div>
      </div>

      {/* 성능 팁 */}
      {fps < 30 && (
        <div
          style={{
            marginTop: 10,
            paddingTop: 10,
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            fontSize: 11,
            color: '#fbbf24',
            lineHeight: 1.4,
          }}
        >
          💡 성능 개선 팁:
          <br />
          • 줌 아웃 시도
          <br />• 불필요한 노드 삭제
        </div>
      )}
    </div>
  )
}

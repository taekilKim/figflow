import { useState, useCallback, useEffect, useRef } from 'react'
import { Node, Edge } from '@xyflow/react'

interface HistoryState<NodeData extends Record<string, unknown> = any, EdgeData extends Record<string, unknown> = any> {
  nodes: Node<NodeData>[]
  edges: Edge<EdgeData>[]
}

interface UseFlowHistoryOptions<NodeData extends Record<string, unknown> = any, EdgeData extends Record<string, unknown> = any> {
  nodes: Node<NodeData>[]
  edges: Edge<EdgeData>[]
  setNodes: (nodes: Node<NodeData>[] | ((nodes: Node<NodeData>[]) => Node<NodeData>[])) => void
  setEdges: (edges: Edge<EdgeData>[] | ((edges: Edge<EdgeData>[]) => Edge<EdgeData>[])) => void
  maxHistorySize?: number
}

export function useFlowHistory<NodeData extends Record<string, unknown> = any, EdgeData extends Record<string, unknown> = any>({
  nodes,
  edges,
  setNodes,
  setEdges,
  maxHistorySize = 50,
}: UseFlowHistoryOptions<NodeData, EdgeData>) {
  const [past, setPast] = useState<HistoryState<NodeData, EdgeData>[]>([])
  const [future, setFuture] = useState<HistoryState<NodeData, EdgeData>[]>([])
  const isApplyingHistory = useRef(false)

  // 현재 상태를 스냅샷으로 저장
  const takeSnapshot = useCallback(() => {
    if (isApplyingHistory.current) return

    const snapshot: HistoryState<NodeData, EdgeData> = {
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
    }

    setPast((prev) => {
      const newPast = [...prev, snapshot]
      // 최대 히스토리 크기 제한
      if (newPast.length > maxHistorySize) {
        return newPast.slice(newPast.length - maxHistorySize)
      }
      return newPast
    })

    // 새로운 액션이 발생하면 future는 초기화
    setFuture([])
  }, [nodes, edges, maxHistorySize])

  // Undo
  const undo = useCallback(() => {
    if (past.length === 0) return

    const newPast = [...past]
    const previousState = newPast.pop()

    if (!previousState) return

    // 현재 상태를 future에 저장
    const currentState: HistoryState<NodeData, EdgeData> = {
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
    }

    setFuture((prev) => [...prev, currentState])
    setPast(newPast)

    // 이전 상태 복원
    isApplyingHistory.current = true
    setNodes(previousState.nodes)
    setEdges(previousState.edges)

    // 다음 프레임에 플래그 리셋
    setTimeout(() => {
      isApplyingHistory.current = false
    }, 0)
  }, [past, nodes, edges, setNodes, setEdges])

  // Redo
  const redo = useCallback(() => {
    if (future.length === 0) return

    const newFuture = [...future]
    const nextState = newFuture.pop()

    if (!nextState) return

    // 현재 상태를 past에 저장
    const currentState: HistoryState<NodeData, EdgeData> = {
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
    }

    setPast((prev) => [...prev, currentState])
    setFuture(newFuture)

    // 다음 상태 복원
    isApplyingHistory.current = true
    setNodes(nextState.nodes)
    setEdges(nextState.edges)

    // 다음 프레임에 플래그 리셋
    setTimeout(() => {
      isApplyingHistory.current = false
    }, 0)
  }, [future, nodes, edges, setNodes, setEdges])

  // 히스토리 초기화
  const clearHistory = useCallback(() => {
    setPast([])
    setFuture([])
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // input/textarea에서는 동작하지 않도록
      const target = event.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return
      }

      // Ctrl+Z (또는 Cmd+Z on Mac)
      if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
        event.preventDefault()
        undo()
      }

      // Ctrl+Y 또는 Ctrl+Shift+Z (Redo)
      if (
        ((event.ctrlKey || event.metaKey) && event.key === 'y') ||
        ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'z')
      ) {
        event.preventDefault()
        redo()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [undo, redo])

  return {
    takeSnapshot,
    undo,
    redo,
    clearHistory,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
  }
}

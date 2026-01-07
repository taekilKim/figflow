import { useCallback, useEffect, useState, useRef } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  Connection,
  addEdge,
  reconnectEdge,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  ConnectionLineType,
  OnConnectStart,
  OnConnectEnd,
  MarkerType,
  SelectionMode,
  useViewport,
  useOnSelectionChange,
  useReactFlow,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { SmartStepEdge } from '@tisoap/react-flow-smart-edge'
import { Plus, FileArrowDown, ArrowsClockwise, FloppyDisk, Export, AlignLeft, AlignCenterHorizontal, AlignRight, AlignTop, AlignCenterVertical, AlignBottom, ArrowCounterClockwise, ArrowClockwise } from '@phosphor-icons/react'
import FrameNode from './FrameNode'
import AddFrameDialog from './AddFrameDialog'
import FigmaFileImportDialog from './FigmaFileImportDialog'
import { FlowNodeData, FlowEdgeData } from '../types'
import { saveProject, loadProject } from '../utils/storage'
import { getFigmaImages, getFigmaToken } from '../utils/figma'
import { useFlowHistory } from '../hooks/useFlowHistory'
import '../styles/FlowCanvas.css'

// 스마트 엣지 타입 등록 (직각 우회)
const edgeTypes = {
  smart: SmartStepEdge,
}

// 커스텀 노드 타입 등록
const nodeTypes = {
  frameNode: FrameNode,
}

interface FlowCanvasProps {
  onNodeSelect: (nodeId: string | null) => void
  onEdgeSelect: (edgeId: string | null) => void
  onSelectionChange?: (nodeIds: string[]) => void
}

// 초기 데모 데이터
const initialNodes: Node<FlowNodeData>[] = [
  {
    id: '1',
    type: 'frameNode',
    position: { x: 100, y: 100 },
    data: {
      figma: {
        fileKey: 'demo-file-key',
        nodeId: '1',
        nodeUrl: 'https://www.figma.com/file/demo',
      },
      meta: {
        title: '로그인 화면',
        status: 'approved',
        notes: '사용자 이메일과 비밀번호를 입력받는 화면입니다.',
      },
    },
  },
  {
    id: '2',
    type: 'frameNode',
    position: { x: 450, y: 100 },
    data: {
      figma: {
        fileKey: 'demo-file-key',
        nodeId: '2',
        nodeUrl: 'https://www.figma.com/file/demo',
      },
      meta: {
        title: '메인 대시보드',
        status: 'review',
        notes: '로그인 후 보여지는 메인 화면입니다.',
      },
    },
  },
  {
    id: '3',
    type: 'frameNode',
    position: { x: 800, y: 100 },
    data: {
      figma: {
        fileKey: 'demo-file-key',
        nodeId: '3',
        nodeUrl: 'https://www.figma.com/file/demo',
      },
      meta: {
        title: '프로필 설정',
        status: 'draft',
      },
    },
  },
]

const initialEdges: Edge<FlowEdgeData>[] = [
  {
    id: 'e1-2',
    source: '1',
    target: '2',
    label: '로그인 성공',
    data: { sourceType: 'manual' },
  },
  {
    id: 'e2-3',
    source: '2',
    target: '3',
    label: '프로필 클릭',
    data: { sourceType: 'manual' },
  },
]

// 정렬 툴바 컴포넌트 (선택된 노드가 2개 이상일 때 표시)
const AlignmentToolbar = ({ selectedNodeIds, takeSnapshot }: { selectedNodeIds: string[], takeSnapshot: () => void }) => {
  const { setNodes } = useReactFlow()

  const alignNodes = (direction: string) => {
    // 정렬 전에 스냅샷 저장 (Undo 가능하도록)
    takeSnapshot()

    setNodes((nodes) => {
      const selectedNodes = nodes.filter((n) => selectedNodeIds.includes(n.id))
      if (selectedNodes.length < 2) return nodes

      // 기준점 계산
      let targetValue = 0
      switch (direction) {
        case 'left':
          targetValue = Math.min(...selectedNodes.map(n => n.position.x))
          break
        case 'right': {
          const rightEdges = selectedNodes.map(n => n.position.x + ((n as any).measured?.width || 300))
          targetValue = Math.max(...rightEdges)
          break
        }
        case 'top':
          targetValue = Math.min(...selectedNodes.map(n => n.position.y))
          break
        case 'bottom': {
          const bottomEdges = selectedNodes.map(n => n.position.y + ((n as any).measured?.height || 400))
          targetValue = Math.max(...bottomEdges)
          break
        }
        case 'centerH': {
          // 수평 중앙
          const centerX = selectedNodes.reduce((acc, n) => acc + n.position.x + (((n as any).measured?.width || 300) / 2), 0) / selectedNodes.length
          targetValue = centerX
          break
        }
        case 'centerV': {
          // 수직 중앙
          const centerY = selectedNodes.reduce((acc, n) => acc + n.position.y + (((n as any).measured?.height || 400) / 2), 0) / selectedNodes.length
          targetValue = centerY
          break
        }
      }

      return nodes.map((n) => {
        if (!selectedNodeIds.includes(n.id)) return n
        const width = ((n as any).measured?.width || 300)
        const height = ((n as any).measured?.height || 400)

        let newPos = { ...n.position }

        switch (direction) {
          case 'left': newPos.x = targetValue; break
          case 'right': newPos.x = targetValue - width; break
          case 'centerH': newPos.x = targetValue - width / 2; break
          case 'top': newPos.y = targetValue; break
          case 'bottom': newPos.y = targetValue - height; break
          case 'centerV': newPos.y = targetValue - height / 2; break
        }
        return { ...n, position: newPos }
      })
    })
  }

  const distributeNodes = (direction: 'horizontal' | 'vertical') => {
    // 분배 전에 스냅샷 저장
    takeSnapshot()

    setNodes((nodes) => {
      const selectedNodes = nodes.filter((n) => selectedNodeIds.includes(n.id))
      if (selectedNodes.length < 3) return nodes // 3개 이상이어야 간격 조정 의미 있음

      // 1. 위치 기준으로 정렬
      const sorted = [...selectedNodes].sort((a, b) => {
        return direction === 'horizontal' ? a.position.x - b.position.x : a.position.y - b.position.y
      })

      // 2. 양끝 노드는 고정하고, 그 사이를 균등 분할
      const first = sorted[0]
      const last = sorted[sorted.length - 1]
      const startPos = direction === 'horizontal' ? first.position.x : first.position.y
      const endPos = direction === 'horizontal' ? last.position.x : last.position.y
      const totalDistance = endPos - startPos
      const interval = totalDistance / (sorted.length - 1)

      return nodes.map((n) => {
        const index = sorted.findIndex((s) => s.id === n.id)
        if (index === -1) return n // 선택 안 된 노드
        if (index === 0 || index === sorted.length - 1) return n // 양끝은 고정

        const newPos = { ...n.position }
        if (direction === 'horizontal') {
          newPos.x = startPos + (interval * index)
        } else {
          newPos.y = startPos + (interval * index)
        }
        return { ...n, position: newPos }
      })
    })
  }

  if (selectedNodeIds.length < 2) return null

  return (
    <div className="alignment-toolbar">
      <button onClick={() => alignNodes('left')} title="왼쪽 정렬"><AlignLeft size={20} weight="bold" /></button>
      <button onClick={() => alignNodes('centerH')} title="수평 중앙 정렬"><AlignCenterHorizontal size={20} weight="bold" /></button>
      <button onClick={() => alignNodes('right')} title="오른쪽 정렬"><AlignRight size={20} weight="bold" /></button>
      <div className="divider" />
      <button onClick={() => alignNodes('top')} title="위쪽 정렬"><AlignTop size={20} weight="bold" /></button>
      <button onClick={() => alignNodes('centerV')} title="수직 중앙 정렬"><AlignCenterVertical size={20} weight="bold" /></button>
      <button onClick={() => alignNodes('bottom')} title="아래쪽 정렬"><AlignBottom size={20} weight="bold" /></button>
      {selectedNodeIds.length >= 3 && (
        <>
          <div className="divider" />
          <button onClick={() => distributeNodes('horizontal')} title="수평 균등 분배">H</button>
          <button onClick={() => distributeNodes('vertical')} title="수직 균등 분배">V</button>
        </>
      )}
    </div>
  )
}

// 줌 레벨 감지 래퍼 (동적 스타일링용)
const FlowWrapper = ({ children, isPanning }: { children: React.ReactNode, isPanning: boolean }) => {
  const { zoom } = useViewport()

  // 줌이 작을수록 스케일을 키워서 UI 요소가 화면상 일정 크기 유지
  // 최소값/최대값 제한(clamp)을 두어 너무 거대해지거나 작아지는 것 방지
  const scale = Math.min(Math.max(1 / zoom, 1), 20)

  return (
    <div
      className={`flow-canvas ${isPanning ? 'panning' : ''}`}
      style={{
        width: '100%',
        height: '100%',
        '--zoom-scale': scale
      } as React.CSSProperties}
    >
      {children}
    </div>
  )
}

function FlowCanvas({ onNodeSelect, onEdgeSelect, onSelectionChange }: FlowCanvasProps) {
  // 초기 로드 시 localStorage에서 데이터 복원
  const loadedProject = loadProject()
  const [nodes, setNodes, onNodesChange] = useNodesState(
    loadedProject?.nodes || initialNodes
  )

  // Figma-style 인터랙션: 스페이스바로 패닝 모드 전환
  const [isPanning, setIsPanning] = useState(false)

  // 선택된 노드 ID 추적 (정렬 툴바 및 좌측 패널 동기화용)
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([])

  // 선택 변경 시 상태 업데이트
  useOnSelectionChange({
    onChange: ({ nodes: selectedNodes }) => {
      const ids = selectedNodes.map(n => n.id)
      setSelectedNodeIds(ids)
      // 상위 컴포넌트에도 알림 (LeftPanel 동기화용)
      if (onSelectionChange) {
        onSelectionChange(ids)
      }
    },
  })

  // 엣지 스타일 적용 헬퍼 함수
  const getEdgeStyle = (edgeData?: FlowEdgeData) => {
    const style: React.CSSProperties = {}

    if (edgeData?.color) {
      style.stroke = edgeData.color
    }

    if (edgeData?.style === 'dashed') {
      style.strokeDasharray = '10,10'
    } else if (edgeData?.style === 'dotted') {
      style.strokeDasharray = '2,4'
    }

    return style
  }

  // 화살표 마커 설정 - React Flow 내장 MarkerType 사용
  const getMarkerEnd = (edgeData?: FlowEdgeData) => {
    const arrowType = edgeData?.arrowType || 'forward'
    if (arrowType === 'forward' || arrowType === 'both') {
      return {
        type: MarkerType.Arrow,
        width: 20,
        height: 20,
        color: edgeData?.color || '#555555',
      }
    }
    return undefined
  }

  const getMarkerStart = (edgeData?: FlowEdgeData) => {
    const arrowType = edgeData?.arrowType || 'forward'
    if (arrowType === 'backward' || arrowType === 'both') {
      return {
        type: MarkerType.Arrow,
        width: 20,
        height: 20,
        color: edgeData?.color || '#555555',
      }
    }
    return undefined
  }

  // 엣지 로드 시 label 및 스타일 속성 설정
  const loadedEdges = loadedProject?.edges?.map((edge) => ({
    ...edge,
    label: edge.label,
    type: 'smoothstep',
    style: getEdgeStyle(edge.data),
    markerEnd: getMarkerEnd(edge.data),
    markerStart: getMarkerStart(edge.data),
  })) || initialEdges

  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge<FlowEdgeData>>(
    loadedEdges
  )
  const [isSyncing, setIsSyncing] = useState(false)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isFileImportDialogOpen, setIsFileImportDialogOpen] = useState(false)
  const connectingNodeId = useRef<string | null>(null)
  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(null)

  // History 관리 (Undo/Redo)
  const { takeSnapshot, undo, redo, canUndo, canRedo } = useFlowHistory<FlowNodeData, FlowEdgeData>({
    nodes,
    edges,
    setNodes,
    setEdges,
  })

  // storage 이벤트 감지하여 노드 및 엣지 업데이트
  useEffect(() => {
    const handleStorageChange = () => {
      const project = loadProject()

      // 노드 업데이트
      if (project?.nodes) {
        setNodes((currentNodes) => {
          return currentNodes.map((currentNode) => {
            const updatedNode = project.nodes.find((n) => n.id === currentNode.id)
            if (updatedNode) {
              return {
                ...currentNode,
                data: updatedNode.data,
              }
            }
            return currentNode
          })
        })
      }

      // 엣지 업데이트
      if (project?.edges) {
        setEdges((currentEdges) => {
          return currentEdges.map((currentEdge) => {
            const updatedEdge = project.edges.find((e) => e.id === currentEdge.id)
            if (updatedEdge) {
              return {
                ...currentEdge,
                label: updatedEdge.label,
                data: updatedEdge.data,
                style: getEdgeStyle(updatedEdge.data),
                markerEnd: getMarkerEnd(updatedEdge.data),
                markerStart: getMarkerStart(updatedEdge.data),
              }
            }
            return currentEdge
          })
        })
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [setEdges, setNodes])

  // Figma-style 스페이스바 패닝 모드
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault() // 스크롤 방지
        setIsPanning(true)
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsPanning(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  // 노드나 엣지가 변경될 때마다 자동 저장
  useEffect(() => {
    const project = {
      id: loadedProject?.id || 'default-project',
      name: loadedProject?.name || 'FigFlow Project',
      nodes: nodes.map((node) => ({
        id: node.id,
        type: node.type || 'frameNode',
        position: node.position,
        data: node.data as FlowNodeData,
      })),
      edges: edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle,
        targetHandle: edge.targetHandle,
        label: typeof edge.label === 'string' ? edge.label : undefined,
        data: edge.data || { sourceType: 'manual' as const },
      })),
      createdAt: loadedProject?.createdAt || Date.now(),
      updatedAt: Date.now(),
    }
    saveProject(project)
  }, [nodes, edges])

  const onConnect = useCallback(
    (connection: Connection) => {
      // 엣지 추가 전 스냅샷
      takeSnapshot()

      const newEdge: Edge<FlowEdgeData> = {
        ...connection,
        id: `e${connection.source}-${connection.target}`,
        data: { sourceType: 'manual' },
      }
      setEdges((eds) => addEdge(newEdge, eds))
      connectingNodeId.current = null
    },
    [setEdges, takeSnapshot]
  )

  const onConnectStart: OnConnectStart = useCallback((_event, params) => {
    connectingNodeId.current = params.nodeId
  }, [])

  // 두 노드 사이의 가장 가까운 핸들 쌍 계산
  const getClosestHandles = useCallback(
    (sourceNode: Node, targetNode: Node): { sourceHandle: string; targetHandle: string } => {
      const dx = targetNode.position.x - sourceNode.position.x
      const dy = targetNode.position.y - sourceNode.position.y

      let sourceHandle = 'source-right'
      let targetHandle = 'target-left'

      // 수평 거리가 수직 거리보다 크면 좌우 연결
      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 0) {
          // 타겟이 오른쪽
          sourceHandle = 'source-right'
          targetHandle = 'target-left'
        } else {
          // 타겟이 왼쪽
          sourceHandle = 'source-left'
          targetHandle = 'target-right'
        }
      } else {
        // 수직 연결
        if (dy > 0) {
          // 타겟이 아래
          sourceHandle = 'source-bottom'
          targetHandle = 'target-top'
        } else {
          // 타겟이 위
          sourceHandle = 'source-top'
          targetHandle = 'target-bottom'
        }
      }

      return { sourceHandle, targetHandle }
    },
    []
  )

  const onConnectEnd: OnConnectEnd = useCallback(
    (event, connectionState) => {
      if (!connectingNodeId.current) {
        return
      }

      // connectionState가 있으면 이미 연결됨 (handle에 드롭)
      if (connectionState.isValid) {
        connectingNodeId.current = null
        return
      }

      // 마우스/터치 좌표 확보
      const clientX = (event as MouseEvent).clientX || (event as TouchEvent).changedTouches?.[0]?.clientX
      const clientY = (event as MouseEvent).clientY || (event as TouchEvent).changedTouches?.[0]?.clientY

      let targetNodeId: string | null = null

      if (clientX && clientY) {
        // 해당 좌표에 있는 모든 요소를 가져옴 (겹친 요소들 포함)
        const elements = document.elementsFromPoint(clientX, clientY)

        // 요소들 중 react-flow__node 클래스를 가진 요소 찾기
        const nodeElement = elements.find((el) => el.classList.contains('react-flow__node'))

        if (nodeElement) {
          targetNodeId = nodeElement.getAttribute('data-id')
        }
      }

      // 연결 생성
      if (targetNodeId && targetNodeId !== connectingNodeId.current) {
        const sourceNode = nodes.find((n) => n.id === connectingNodeId.current)
        const targetNode = nodes.find((n) => n.id === targetNodeId)

        if (sourceNode && targetNode) {
          const { sourceHandle, targetHandle } = getClosestHandles(sourceNode, targetNode)

          const newEdge: Edge<FlowEdgeData> = {
            id: `e${connectingNodeId.current}-${targetNodeId}-${Date.now()}`,
            source: connectingNodeId.current,
            target: targetNodeId,
            sourceHandle,
            targetHandle,
            data: { sourceType: 'manual' },
          }
          setEdges((eds) => addEdge(newEdge, eds))
        }
      }

      connectingNodeId.current = null
    },
    [nodes, setEdges, getClosestHandles]
  )

  // 엣지 재연결 - React Flow의 reconnectEdge 헬퍼 사용
  const onReconnect = useCallback(
    (oldEdge: Edge, newConnection: Connection) => {
      setEdges((els) => reconnectEdge(oldEdge, newConnection, els) as Edge<FlowEdgeData>[])
    },
    [setEdges]
  )

  // 엣지 재연결 종료 시 - 노드 바디에 드롭했을 때 처리 (Figma-like)
  const onReconnectEnd = useCallback(
    (event: MouseEvent | TouchEvent, edge: Edge, handleType: 'source' | 'target') => {
      const clientX = (event as MouseEvent).clientX || (event as TouchEvent).changedTouches?.[0]?.clientX
      const clientY = (event as MouseEvent).clientY || (event as TouchEvent).changedTouches?.[0]?.clientY

      if (!clientX || !clientY) return

      // 좌표 아래 요소 탐색 (elementsFromPoint 사용)
      const elements = document.elementsFromPoint(clientX, clientY)
      const nodeElement = elements.find((el) => el.classList.contains('react-flow__node'))

      if (nodeElement) {
        const targetNodeId = nodeElement.getAttribute('data-id')

        // 유효한 노드이고 기존 연결과 다를 경우 재연결
        if (targetNodeId && targetNodeId !== edge.source && targetNodeId !== edge.target) {
          const sourceNode = nodes.find((n) => n.id === (handleType === 'source' ? targetNodeId : edge.source))
          const targetNode = nodes.find((n) => n.id === (handleType === 'target' ? targetNodeId : edge.target))

          if (sourceNode && targetNode) {
            const { sourceHandle, targetHandle } = getClosestHandles(sourceNode, targetNode)

            const newConnection: Connection = {
              source: handleType === 'source' ? targetNodeId : edge.source,
              target: handleType === 'target' ? targetNodeId : edge.target,
              sourceHandle: handleType === 'source' ? sourceHandle : (edge.sourceHandle || null),
              targetHandle: handleType === 'target' ? targetHandle : (edge.targetHandle || null),
            }

            setEdges((els) => reconnectEdge(edge, newConnection, els) as Edge<FlowEdgeData>[])
          }
        }
      }
    },
    [nodes, setEdges, getClosestHandles]
  )

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      onNodeSelect(node.id)
      onEdgeSelect(null)
    },
    [onNodeSelect, onEdgeSelect]
  )

  const onEdgeClick = useCallback(
    (_event: React.MouseEvent, edge: Edge) => {
      onEdgeSelect(edge.id)
      onNodeSelect(null)
    },
    [onNodeSelect, onEdgeSelect]
  )

  const onPaneClick = useCallback(() => {
    onNodeSelect(null)
    onEdgeSelect(null)
  }, [onNodeSelect, onEdgeSelect])

  // Delete/Backspace 키로 선택된 노드 및 엣지 삭제
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Delete' || event.key === 'Backspace') {
        // input이나 textarea에서는 동작하지 않도록
        const target = event.target as HTMLElement
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
          return
        }

        // 선택된 노드들 삭제
        const selectedNodes = (nodes as Node[]).filter((node) => node.selected)
        if (selectedNodes.length > 0) {
          // 삭제 전 스냅샷
          takeSnapshot()

          const nodeIdsToDelete = selectedNodes.map((node) => node.id)
          setNodes((nds) => nds.filter((node) => !nodeIdsToDelete.includes(node.id)))

          // 연결된 엣지도 자동으로 삭제
          setEdges((eds) =>
            eds.filter(
              (edge) =>
                !nodeIdsToDelete.includes(edge.source) &&
                !nodeIdsToDelete.includes(edge.target)
            )
          )

          onNodeSelect(null)
          event.preventDefault()
          return
        }

        // 선택된 엣지들 삭제
        const selectedEdges = (edges as Edge[]).filter((edge) => edge.selected)
        if (selectedEdges.length > 0) {
          // 삭제 전 스냅샷
          takeSnapshot()

          const edgeIdsToDelete = selectedEdges.map((edge) => edge.id)
          setEdges((eds) => eds.filter((edge) => !edgeIdsToDelete.includes(edge.id)))
          onEdgeSelect(null)
          event.preventDefault()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [nodes, edges, setNodes, setEdges, onNodeSelect, onEdgeSelect, takeSnapshot])

  const handleSave = useCallback(() => {
    const project = {
      id: loadedProject?.id || 'default-project',
      name: loadedProject?.name || 'FigFlow Project',
      nodes: nodes.map((node) => ({
        id: node.id,
        type: node.type || 'frameNode',
        position: node.position,
        data: node.data as FlowNodeData,
      })),
      edges: edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle,
        targetHandle: edge.targetHandle,
        label: typeof edge.label === 'string' ? edge.label : undefined,
        data: edge.data || { sourceType: 'manual' as const },
      })),
      createdAt: loadedProject?.createdAt || Date.now(),
      updatedAt: Date.now(),
    }
    saveProject(project)
    alert('프로젝트가 저장되었습니다!')
  }, [nodes, edges])

  const handleSync = useCallback(async () => {
    const token = getFigmaToken()

    if (!token) {
      const userToken = prompt('Figma Personal Access Token을 입력하세요:')
      if (!userToken) return

      // 간단한 검증 후 저장
      localStorage.setItem('figflow_figma_token', userToken)
    }

    const finalToken = getFigmaToken()
    if (!finalToken) return

    setIsSyncing(true)

    try {
      // fileKey별로 노드들을 그룹화
      const nodesByFile = new Map<string, { node: Node<FlowNodeData>; nodeId: string }[]>()

      nodes.forEach((node) => {
        const data = node.data as FlowNodeData
        const fileKey = data.figma.fileKey

        if (!nodesByFile.has(fileKey)) {
          nodesByFile.set(fileKey, [])
        }
        nodesByFile.get(fileKey)!.push({
          node,
          nodeId: data.figma.nodeId,
        })
      })

      // 각 파일에 대해 이미지 가져오기
      const updates: Array<{ nodeIndex: number; thumbnailUrl: string }> = []

      for (const [fileKey, fileNodes] of nodesByFile) {
        const nodeIds = fileNodes.map((n) => n.nodeId)
        const results = await getFigmaImages(finalToken, { fileKey, nodeIds })

        results.forEach((result, idx) => {
          if (result.imageUrl) {
            const nodeIndex = nodes.findIndex((n) => n.id === fileNodes[idx].node.id)
            if (nodeIndex !== -1) {
              updates.push({
                nodeIndex,
                thumbnailUrl: result.imageUrl,
              })
            }
          }
        })
      }

      // 노드 업데이트
      if (updates.length > 0) {
        const updatedNodes = [...nodes]
        updates.forEach(({ nodeIndex, thumbnailUrl }) => {
          const node = updatedNodes[nodeIndex]
          const data = node.data as FlowNodeData
          updatedNodes[nodeIndex] = {
            ...node,
            data: {
              ...data,
              meta: {
                ...data.meta,
                thumbnailUrl,
                lastSyncedAt: Date.now(),
              },
            },
          }
        })
        setNodes(updatedNodes)
        alert(`${updates.length}개의 썸네일이 업데이트되었습니다!`)
      } else {
        alert('업데이트된 썸네일이 없습니다.')
      }
    } catch (error) {
      console.error('Sync failed:', error)
      alert('싱크 실패: ' + (error instanceof Error ? error.message : '알 수 없는 오류'))
    } finally {
      setIsSyncing(false)
    }
  }, [nodes, setNodes])

  const handleAddFrame = useCallback((frameData: {
    fileKey: string
    nodeId: string
    nodeUrl: string
    title: string
    thumbnailUrl: string | null
    dimensions: { width: number; height: number } | null
  }) => {
    // 노드 추가 전 스냅샷
    takeSnapshot()

    // 새로운 노드 생성 - Figma 원본 크기 그대로 사용
    const newNode: Node<FlowNodeData> = {
      id: `node-${Date.now()}`,
      type: 'frameNode',
      position: {
        x: Math.random() * 400 + 100,
        y: Math.random() * 400 + 100,
      },
      style: frameData.dimensions ? { width: frameData.dimensions.width, height: 'auto' } : undefined,
      data: {
        figma: {
          fileKey: frameData.fileKey,
          nodeId: frameData.nodeId,
          nodeUrl: frameData.nodeUrl,
        },
        meta: {
          title: frameData.title,
          status: 'draft',
          thumbnailUrl: frameData.thumbnailUrl || undefined,
          lastSyncedAt: Date.now(),
          dimensions: frameData.dimensions || undefined,
        },
      },
    }

    // 노드 추가
    setNodes((nds) => [...nds, newNode])
    alert(`"${frameData.title}" 프레임이 추가되었습니다! 썸네일과 함께 캔버스에 표시됩니다.`)
  }, [setNodes, takeSnapshot])

  // 배치 프레임 가져오기 (파일 전체 import)
  const handleBatchImport = useCallback(async (
    fileKey: string,
    selectedFrames: Array<{
      nodeId: string
      name: string
      width: number
      height: number
    }>
  ) => {
    console.log('handleBatchImport called', { fileKey, framesCount: selectedFrames.length })

    // 배치 추가 전 스냅샷
    takeSnapshot()

    const accessToken = getFigmaToken()
    if (!accessToken) {
      alert('Figma Access Token이 설정되지 않았습니다.')
      return
    }

    // 다이얼로그 닫기
    setIsFileImportDialogOpen(false)

    try {
      // 진행도 초기화
      setImportProgress({ current: 0, total: selectedFrames.length })

      console.log('Fetching images...')

      // 각 프레임을 개별적으로 처리하여 진행도 표시
      const imageResults: Array<{ nodeId: string; imageUrl: string | null }> = []

      for (let i = 0; i < selectedFrames.length; i++) {
        const frame = selectedFrames[i]
        setImportProgress({ current: i + 1, total: selectedFrames.length })

        const result = await getFigmaImages(accessToken, {
          fileKey,
          nodeIds: [frame.nodeId],
          scale: 1,
        })

        if (result[0]) {
          imageResults.push(result[0])
        }
      }

      console.log('Images fetched:', imageResults)

      // 그리드 레이아웃으로 배치 (3열)
      const columns = 3
      const spacing = 50
      const startX = 100
      const startY = 100

      const newNodes: Node<FlowNodeData>[] = selectedFrames.map((frame, index) => {
        const row = Math.floor(index / columns)
        const col = index % columns

        // 그리드 위치 계산
        const x = startX + col * (450 + spacing)
        const y = startY + row * (900 + spacing)

        const thumbnailUrl = imageResults.find(r => r.nodeId === frame.nodeId)?.imageUrl

        return {
          id: `node-${Date.now()}-${index}`,
          type: 'frameNode',
          position: { x, y },
          style: { width: frame.width, height: 'auto' },
          data: {
            figma: {
              fileKey,
              nodeId: frame.nodeId,
              nodeUrl: `https://www.figma.com/file/${fileKey}?node-id=${frame.nodeId.replace(/:/g, '-')}`,
            },
            meta: {
              title: frame.name,
              status: 'draft',
              thumbnailUrl: thumbnailUrl || undefined,
              lastSyncedAt: Date.now(),
              dimensions: { width: frame.width, height: frame.height },
            },
          },
        }
      })

      // 모든 노드 추가
      console.log('Adding nodes:', newNodes)
      setNodes((nds) => {
        const updated = [...nds, ...newNodes]
        console.log('Updated nodes:', updated)
        return updated
      })

      // 진행도 숨기기
      setImportProgress(null)
      alert(`${selectedFrames.length}개의 프레임이 추가되었습니다!`)
    } catch (error) {
      console.error('Batch import failed:', error)
      setImportProgress(null)
      alert('프레임 가져오기 실패: ' + (error instanceof Error ? error.message : '알 수 없는 오류'))
    }
  }, [setNodes, takeSnapshot])

  return (
    <>
      <div className="toolbar">
        <button
          className="toolbar-button primary"
          onClick={() => setIsAddDialogOpen(true)}
        >
          <Plus size={20} weight="bold" />
          프레임 추가
        </button>
        <button
          className="toolbar-button primary"
          onClick={() => setIsFileImportDialogOpen(true)}
        >
          <FileArrowDown size={20} weight="bold" />
          파일 가져오기
        </button>
        <div className="toolbar-divider" />
        <button
          className="toolbar-button"
          onClick={undo}
          disabled={!canUndo}
          title="실행 취소 (Ctrl+Z)"
        >
          <ArrowCounterClockwise size={20} weight="bold" />
        </button>
        <button
          className="toolbar-button"
          onClick={redo}
          disabled={!canRedo}
          title="다시 실행 (Ctrl+Y)"
        >
          <ArrowClockwise size={20} weight="bold" />
        </button>
        <div className="toolbar-divider" />
        <button
          className="toolbar-button"
          onClick={handleSync}
          disabled={isSyncing}
        >
          <ArrowsClockwise size={20} weight="bold" />
          {isSyncing ? '싱크 중...' : 'Sync'}
        </button>
        <button className="toolbar-button" onClick={handleSave}>
          <FloppyDisk size={20} weight="bold" />
          저장
        </button>
        <button className="toolbar-button">
          <Export size={20} weight="bold" />
          Export
        </button>
      </div>

      <FlowWrapper isPanning={isPanning}>
        <ReactFlow
        nodes={nodes.map((node) => ({
          ...node,
          className: connectingNodeId.current && connectingNodeId.current !== node.id ? 'connection-target' : '',
        }))}
        edges={edges.map((edge) => ({
          ...edge,
          type: 'smart',
          updatable: 'target',
          style: getEdgeStyle(edge.data),
          markerEnd: getMarkerEnd(edge.data),
          markerStart: getMarkerStart(edge.data),
        }))}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onConnectStart={onConnectStart}
        onConnectEnd={onConnectEnd}
        onReconnect={onReconnect}
        onReconnectEnd={onReconnectEnd}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        connectionLineType={ConnectionLineType.Step}
        defaultEdgeOptions={{
          type: 'smart',
          animated: false,
          focusable: true,
          style: { strokeWidth: 2, stroke: '#555555' },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: '#555555',
            width: 20,
            height: 20,
          },
        }}
        edgesReconnectable={true}
        reconnectRadius={30}
        panOnDrag={isPanning}
        selectionOnDrag={!isPanning}
        panOnScroll={true}
        selectionMode={SelectionMode.Partial}
        connectOnClick={false}
        fitView
        minZoom={0.1}
        maxZoom={2}
        style={{
          cursor: isPanning ? 'grab' : 'default',
        }}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
        <Controls />
        <MiniMap
          nodeStrokeWidth={3}
          zoomable
          pannable
        />
        <AlignmentToolbar selectedNodeIds={selectedNodeIds} takeSnapshot={takeSnapshot} />
      </ReactFlow>
      </FlowWrapper>

      <AddFrameDialog
        isOpen={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        onAdd={handleAddFrame}
      />

      <FigmaFileImportDialog
        isOpen={isFileImportDialogOpen}
        onClose={() => setIsFileImportDialogOpen(false)}
        onImport={handleBatchImport}
      />

      {/* 프레임 가져오기 진행도 오버레이 */}
      {importProgress && (
        <div className="import-progress-overlay">
          <div className="import-progress-content">
            <div className="import-spinner"></div>
            <h3>프레임 불러오는 중...</h3>
            <p className="import-progress-text">
              {importProgress.current} / {importProgress.total}
            </p>
            <div className="import-progress-bar">
              <div
                className="import-progress-fill"
                style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default FlowCanvas

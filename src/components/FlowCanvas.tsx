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
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { SmartBezierEdge } from '@tisoap/react-flow-smart-edge'
import { Plus, FileArrowDown, ArrowsClockwise, FloppyDisk, Export } from '@phosphor-icons/react'
import FrameNode from './FrameNode'
import AddFrameDialog from './AddFrameDialog'
import FigmaFileImportDialog from './FigmaFileImportDialog'
import { FlowNodeData, FlowEdgeData } from '../types'
import { saveProject, loadProject } from '../utils/storage'
import { getFigmaImages, getFigmaToken } from '../utils/figma'
import '../styles/FlowCanvas.css'

// 스마트 엣지 타입 등록
const edgeTypes = {
  smart: SmartBezierEdge,
}

// 커스텀 노드 타입 등록
const nodeTypes = {
  frameNode: FrameNode,
}

interface FlowCanvasProps {
  onNodeSelect: (nodeId: string | null) => void
  onEdgeSelect: (edgeId: string | null) => void
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

// 줌 레벨 감지 래퍼 (동적 스타일링용)
const FlowWrapper = ({ children, isPanning }: { children: React.ReactNode, isPanning: boolean }) => {
  const { zoom } = useViewport()
  return (
    <div
      className={`flow-canvas ${isPanning ? 'panning' : ''}`}
      style={{
        '--zoom-scale': `${1 / zoom}`
      } as React.CSSProperties}
    >
      {children}
    </div>
  )
}

function FlowCanvas({ onNodeSelect, onEdgeSelect }: FlowCanvasProps) {
  // 초기 로드 시 localStorage에서 데이터 복원
  const loadedProject = loadProject()
  const [nodes, setNodes, onNodesChange] = useNodesState(
    loadedProject?.nodes || initialNodes
  )

  // Figma-style 인터랙션: 스페이스바로 패닝 모드 전환
  const [isPanning, setIsPanning] = useState(false)

  // 선택된 노드 ID 추적 (좌측 패널 동기화용 - 추후 사용 예정)
  const [, setSelectedNodeIds] = useState<string[]>([])

  // 선택 변경 시 상태 업데이트
  useOnSelectionChange({
    onChange: ({ nodes: selectedNodes }) => {
      setSelectedNodeIds(selectedNodes.map(n => n.id))
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
      const newEdge: Edge<FlowEdgeData> = {
        ...connection,
        id: `e${connection.source}-${connection.target}`,
        data: { sourceType: 'manual' },
      }
      setEdges((eds) => addEdge(newEdge, eds))
      connectingNodeId.current = null
    },
    [setEdges]
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
  }, [nodes, edges, setNodes, setEdges, onNodeSelect, onEdgeSelect])

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
  }, [setNodes])

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
  }, [setNodes])

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
        connectionLineType={ConnectionLineType.SmoothStep}
        defaultEdgeOptions={{
          type: 'smart',
          animated: false,
          style: { strokeWidth: 2, stroke: '#555555' },
          markerEnd: {
            type: MarkerType.Arrow,
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

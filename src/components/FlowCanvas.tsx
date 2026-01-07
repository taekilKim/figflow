import { useCallback, useEffect, useState } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  Connection,
  addEdge,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  ConnectionLineType,
  OnConnectStart,
  OnConnectEnd,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import FrameNode from './FrameNode'
import AddFrameDialog from './AddFrameDialog'
import FigmaFileImportDialog from './FigmaFileImportDialog'
import { FlowNodeData, FlowEdgeData } from '../types'
import { saveProject, loadProject } from '../utils/storage'
import { getFigmaImages, getFigmaToken } from '../utils/figma'
import '../styles/FlowCanvas.css'

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

function FlowCanvas({ onNodeSelect, onEdgeSelect }: FlowCanvasProps) {
  // 초기 로드 시 localStorage에서 데이터 복원
  const loadedProject = loadProject()
  const [nodes, setNodes, onNodesChange] = useNodesState(
    loadedProject?.nodes || initialNodes
  )

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

  // 화살표 마커 ID 생성 - 항상 값 반환
  const getMarkerEnd = (edgeData?: FlowEdgeData) => {
    const arrowType = edgeData?.arrowType || 'forward'
    if (arrowType === 'forward' || arrowType === 'both') {
      return 'url(#arrow)'
    }
    return undefined
  }

  const getMarkerStart = (edgeData?: FlowEdgeData) => {
    const arrowType = edgeData?.arrowType || 'forward'
    if (arrowType === 'backward' || arrowType === 'both') {
      return 'url(#arrow-reverse)'
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
  const [connectingNodeId, setConnectingNodeId] = useState<string | null>(null)
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
      setConnectingNodeId(null)
    },
    [setEdges]
  )

  const onConnectStart: OnConnectStart = useCallback((_event, params) => {
    setConnectingNodeId(params.nodeId)
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
      try {
        if (!connectingNodeId) {
          return
        }

        // connectionState가 있으면 이미 연결됨 (handle에 드롭)
        if (connectionState.isValid) {
          return
        }

        // 프레임 내부에 드롭한 경우 수동으로 연결 생성
        const targetElement = document.elementFromPoint(
          (event as MouseEvent).clientX,
          (event as MouseEvent).clientY
        )

        // 모든 노드 요소들을 찾아서 확인
        let currentElement: Element | null = targetElement
        while (currentElement) {
          if (currentElement.classList.contains('react-flow__node')) {
            const targetNodeId = currentElement.getAttribute('data-id')

            if (targetNodeId && targetNodeId !== connectingNodeId) {
              const sourceNode = nodes.find((n) => n.id === connectingNodeId)
              const targetNode = nodes.find((n) => n.id === targetNodeId)

              if (sourceNode && targetNode) {
                const { sourceHandle, targetHandle } = getClosestHandles(sourceNode, targetNode)

                const newEdge: Edge<FlowEdgeData> = {
                  id: `e${connectingNodeId}-${targetNodeId}-${Date.now()}`,
                  source: connectingNodeId,
                  target: targetNodeId,
                  sourceHandle,
                  targetHandle,
                  data: { sourceType: 'manual' },
                }
                setEdges((eds) => addEdge(newEdge, eds))
                break
              }
            }
          }
          currentElement = currentElement.parentElement
        }
      } finally {
        setConnectingNodeId(null)
      }
    },
    [connectingNodeId, nodes, setEdges, getClosestHandles]
  )

  const onReconnect = useCallback(
    (oldEdge: Edge, newConnection: Connection) => {
      setEdges((els) => {
        const edge = els.find((e) => e.id === oldEdge.id)
        if (!edge) return els

        return els.map((e) => {
          if (e.id === oldEdge.id) {
            return {
              ...e,
              source: newConnection.source,
              target: newConnection.target,
              sourceHandle: newConnection.sourceHandle,
              targetHandle: newConnection.targetHandle,
            }
          }
          return e
        })
      })
    },
    [setEdges]
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
    <div className="flow-canvas">
      {/* SVG 마커 정의 - ReactFlow 외부에 배치 */}
      <svg style={{ position: 'absolute', width: 0, height: 0 }}>
        <defs>
          <marker
            id="arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#555" />
          </marker>
          <marker
            id="arrow-reverse"
            viewBox="0 0 10 10"
            refX="1"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path d="M 10 0 L 0 5 L 10 10 z" fill="#555" />
          </marker>
        </defs>
      </svg>

      <div className="toolbar">
        <button
          className="toolbar-button primary"
          onClick={() => setIsAddDialogOpen(true)}
        >
          프레임 추가
        </button>
        <button
          className="toolbar-button primary"
          onClick={() => setIsFileImportDialogOpen(true)}
        >
          파일 가져오기
        </button>
        <button
          className="toolbar-button"
          onClick={handleSync}
          disabled={isSyncing}
        >
          {isSyncing ? '싱크 중...' : 'Sync'}
        </button>
        <button className="toolbar-button" onClick={handleSave}>
          저장
        </button>
        <button className="toolbar-button">
          Export
        </button>
      </div>

      <ReactFlow
        nodes={nodes.map((node) => ({
          ...node,
          className: connectingNodeId && connectingNodeId !== node.id ? 'connection-target' : '',
        }))}
        edges={edges.map((edge) => ({
          ...edge,
          style: getEdgeStyle(edge.data),
          markerEnd: getMarkerEnd(edge.data),
          markerStart: getMarkerStart(edge.data),
          updatable: true,
        }))}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onConnectStart={onConnectStart}
        onConnectEnd={onConnectEnd}
        onReconnect={onReconnect}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        connectionLineType={ConnectionLineType.SmoothStep}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: false,
        }}
        edgesReconnectable={true}
        reconnectRadius={30}
        connectOnClick={false}
        fitView
        minZoom={0.1}
        maxZoom={2}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
        <Controls />
        <MiniMap
          nodeStrokeWidth={3}
          zoomable
          pannable
        />
      </ReactFlow>

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
    </div>
  )
}

export default FlowCanvas

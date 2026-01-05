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
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import FrameNode from './FrameNode'
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
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge<FlowEdgeData>>(
    loadedProject?.edges || initialEdges
  )
  const [isSyncing, setIsSyncing] = useState(false)

  // 노드나 엣지가 변경될 때마다 자동 저장
  useEffect(() => {
    const project = {
      id: loadedProject?.id || 'default-project',
      name: loadedProject?.name || 'FigFlow Project',
      nodes: nodes.map((node) => ({
        id: node.id,
        position: node.position,
        data: node.data as FlowNodeData,
      })),
      edges: edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
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

  const handleSave = useCallback(() => {
    const project = {
      id: loadedProject?.id || 'default-project',
      name: loadedProject?.name || 'FigFlow Project',
      nodes: nodes.map((node) => ({
        id: node.id,
        position: node.position,
        data: node.data as FlowNodeData,
      })),
      edges: edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
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

  return (
    <div className="flow-canvas">
      <div className="toolbar">
        <button className="toolbar-button primary">
          프레임 추가
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
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
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
    </div>
  )
}

export default FlowCanvas

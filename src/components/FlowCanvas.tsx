import { useCallback, useEffect, useState, useRef } from 'react'
import {
  ReactFlow,
  Background,
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
  SelectionMode,
  useViewport,
  useOnSelectionChange,
  useReactFlow,
  MarkerType,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
// 🔥 Pivot: Smart Edge 제거, Native StepEdge 복귀
import TDSStepEdge from './TDSStepEdge'
import TDSControls from './TDSControls'
import { Plus, FileArrowDown, ArrowsClockwise, FloppyDisk, Export, AlignLeft, AlignCenterHorizontal, AlignRight, AlignTop, AlignCenterVertical, AlignBottom } from '@phosphor-icons/react'
import FrameNode from './FrameNode'
import AddFrameDialog from './AddFrameDialog'
import FigmaFileImportDialog from './FigmaFileImportDialog'
import { FlowNodeData, FlowEdgeData } from '../types'
import { saveProject, loadProject, getProjectById, updateProject } from '../utils/storage'
import { getFigmaImages, getFigmaToken } from '../utils/figma'
import '../styles/FlowCanvas.css'

// 🔥 Pivot: Native Step Edge 사용 (Smart Routing 제거)
// 🔥 [Fix] TDSStepEdge 사용 (onReconnect 필수, 라벨 색상 처리)
const edgeTypes = {
  step: TDSStepEdge,
}

// 커스텀 노드 타입 등록
const nodeTypes = {
  frameNode: FrameNode,
}

// 🔥 [Fix] Marker 객체 생성 함수 (orient: auto-start-reverse 필수!)
const createMarker = (color: string = '#555555'): any => ({
  type: MarkerType.ArrowClosed,
  width: 20,
  height: 20,
  color,
  orient: 'auto-start-reverse' as const,
})

const DEFAULT_MARKER = createMarker()

interface FlowCanvasProps {
  onNodeSelect: (nodeId: string | null) => void
  onEdgeSelect: (edgeId: string | null) => void
  onSelectionChange?: (nodeIds: string[]) => void
  projectId?: string
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
    type: 'step',
    markerEnd: DEFAULT_MARKER,
    data: { sourceType: 'manual' },
  },
  {
    id: 'e2-3',
    source: '2',
    target: '3',
    label: '프로필 클릭',
    type: 'step',
    markerEnd: DEFAULT_MARKER,
    data: { sourceType: 'manual' },
  },
]

// 정렬 툴바 컴포넌트 (선택된 노드가 2개 이상일 때 표시)
const AlignmentToolbar = ({ selectedNodeIds }: { selectedNodeIds: string[] }) => {
  const { setNodes } = useReactFlow()

  const alignNodes = (direction: string) => {

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

// 줌 레벨 인디케이터 (우측 상단 표시)
const ZoomIndicator = () => {
  const { zoom } = useViewport()

  return (
    <div className="zoom-indicator">
      {Math.round(zoom * 100)}%
    </div>
  )
}

// 줌 레벨 감지 래퍼 (동적 스타일링용)
const FlowWrapper = ({ children, isPanning }: { children: React.ReactNode, isPanning: boolean }) => {
  const { zoom } = useViewport()

  // 줌 값을 역수로 계산 (줌 아웃 시 값이 커짐)
  // 예: zoom 0.5 -> scale 2.0, zoom 1.0 -> scale 1.0
  // 🔥 중요: 줌 인(zoom > 1) 시에는 scale을 1로 고정 (글자가 작아지지 않게)
  const scale = zoom < 1 ? (1 / zoom) : 1

  // 🔥 Fix 2: Portal 내부에서도 변수를 쓸 수 있도록 body에 주입
  useEffect(() => {
    document.body.style.setProperty('--zoom-scale', scale.toString())
  }, [scale])

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

function FlowCanvas({ onNodeSelect, onEdgeSelect, onSelectionChange, projectId }: FlowCanvasProps) {
  // React Flow 훅 (단축키 및 디버깅용)
  const { getEdges, zoomTo, fitView, getNodes } = useReactFlow()

  // 초기 로드 시 localStorage에서 데이터 복원
  // projectId가 있으면 해당 프로젝트를, 없으면 기존 방식(단일 프로젝트) 사용
  const loadedProject = projectId ? getProjectById(projectId) : loadProject()
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

  // 🔥 [Final Fix] 마커 문자열 반환 (orient="auto" 적용된 SVG defs 사용)
  const getMarkerEnd = (edgeData?: FlowEdgeData) => {
    const arrowType = edgeData?.arrowType || 'forward'
    if (arrowType === 'forward' || arrowType === 'both') {
      const color = (edgeData?.color as string) || '#555555'
      return createMarker(color)
    }
    return undefined
  }

  const getMarkerStart = (edgeData?: FlowEdgeData) => {
    const arrowType = edgeData?.arrowType || 'forward'
    if (arrowType === 'backward' || arrowType === 'both') {
      const color = (edgeData?.color as string) || '#555555'
      return createMarker(color)
    }
    return undefined
  }

  // 엣지 로드 시 label 및 스타일 속성 설정 + 기본값 설정
  const loadedEdges = loadedProject?.edges?.map((edge) => {
    // 🔥 중요: localStorage의 기존 엣지에 arrowType이 없을 수 있으므로 기본값 설정
    const edgeDataWithDefaults = {
      ...edge.data,
      arrowType: edge.data?.arrowType || 'forward',
      style: edge.data?.style || 'solid',
    }
    const style = getEdgeStyle(edgeDataWithDefaults)
    return {
      ...edge,
      label: edge.label,
      type: 'step',
      data: edgeDataWithDefaults,
      style,
      markerEnd: getMarkerEnd(edgeDataWithDefaults),
      markerStart: getMarkerStart(edgeDataWithDefaults),
    }
  }) || initialEdges

  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge<FlowEdgeData>>(
    loadedEdges
  )
  const [isSyncing, setIsSyncing] = useState(false)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isFileImportDialogOpen, setIsFileImportDialogOpen] = useState(false)
  const connectingNodeId = useRef<string | null>(null)
  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(null)

  // 🔧 Real-time Debugging Tool (Console Backdoor) - 완전체
  useEffect(() => {
    // @ts-ignore - Intentional global debug tool
    window.flowDebug = {
      // ✅ 엣지 상태 확인
      check: () => {
        const currentEdges = getEdges()
        console.log('📊 총 엣지 개수:', currentEdges.length)
        if (currentEdges.length > 0) {
          console.log('🔍 첫 번째 엣지 설정:', currentEdges[0].data?.smartEdge)
          console.log('🎨 첫 번째 엣지 스타일:', currentEdges[0].style)
        } else {
          console.log('⚠️ 현재 연결된 엣지가 없습니다.')
        }
      },

      // 간격 조절
      setPadding: (padding: number) => {
        setEdges((currentEdges) =>
          currentEdges.map(edge => ({
            ...edge,
            data: {
              ...edge.data,
              smartEdge: {
                ...(edge.data?.smartEdge || {}),
                nodePadding: padding
              }
            }
          } as Edge<FlowEdgeData>))
        )
        console.log(`✅ nodePadding을 ${padding}px로 변경했습니다.`)
      },

      // 그리드 비율 조절
      setGrid: (ratio: number) => {
        setEdges((currentEdges) =>
          currentEdges.map(edge => ({
            ...edge,
            data: {
              ...edge.data,
              smartEdge: {
                ...(edge.data?.smartEdge || {}),
                gridRatio: ratio
              }
            }
          } as Edge<FlowEdgeData>))
        )
        console.log(`✅ gridRatio를 ${ratio}로 변경했습니다.`)
      },

      // 현재 엣지 목록 반환
      getEdges: () => {
        const currentEdges = getEdges()
        console.log('Current edges:', currentEdges)
        return currentEdges
      },

      // 현재 노드 목록 반환
      getNodes: () => {
        console.log('Current nodes:', nodes)
        return nodes
      }
    }

    console.log('🔧 디버깅 툴 로드 완료. window.flowDebug.check()를 입력해보세요.')
  }, [setEdges, getEdges, nodes])

  // 🔍 2단계: 런타임 진단 (실시간 상태 확인)
  useEffect(() => {
    const diagnosisInterval = setInterval(() => {
      // 1. CSS 변수 주입 확인
      const container = document.querySelector('.flow-canvas')
      const computedStyle = container ? getComputedStyle(container) : null
      const zoomScale = computedStyle ? computedStyle.getPropertyValue('--zoom-scale') : 'Not Found'

      // 2. 엣지 속성 확인
      const currentEdges = getEdges()
      const firstEdge = currentEdges[0]

      console.log('--- 🔍 FigFlow Diagnosis ---')
      console.log('1. CSS --zoom-scale:', zoomScale) // 숫자가 나와야 함
      console.log('2. Edge Count:', currentEdges.length)

      if (firstEdge) {
        console.log('3. Edge Type:', firstEdge.type) // 'smart'여야 함
        console.log('4. Edge PathOptions:', (firstEdge.data as any)?.pathOptions) // offset: 50이 있어야 함
        console.log('5. Edge SmartEdge:', firstEdge.data?.smartEdge) // nodePadding: 60이 있어야 함
      }
      console.log('----------------------------')
    }, 5000) // 5초마다 진단

    return () => clearInterval(diagnosisInterval)
  }, [getEdges])

  // 🚀 마이그레이션: 기존 엣지에 arrowType, style 기본값 설정 및 localStorage 저장
  useEffect(() => {
    console.log('🚀 Migrating edges: setting default arrowType and style...')

    const project = projectId ? getProjectById(projectId) : loadProject()
    if (!project) return

    let needsUpdate = false
    const migratedEdges = project.edges.map((edge) => {
      // arrowType이나 style이 없으면 기본값 설정
      if (!edge.data?.arrowType || !edge.data?.style) {
        needsUpdate = true
        return {
          ...edge,
          data: {
            ...edge.data,
            arrowType: edge.data?.arrowType || 'forward',
            style: edge.data?.style || 'solid',
          },
        }
      }
      return edge
    })

    // 변경사항이 있으면 localStorage에 저장
    if (needsUpdate) {
      if (projectId) {
        updateProject(projectId, { edges: migratedEdges })
      } else {
        saveProject({ ...project, edges: migratedEdges, updatedAt: Date.now() })
      }
      console.log('✅ Edges migrated and saved to localStorage.')
    }
  }, [projectId]) // projectId가 변경될 때마다 실행 (초기 로드 포함)

  // storage 이벤트 감지하여 노드 및 엣지 업데이트
  useEffect(() => {
    const handleStorageChange = () => {
      const project = projectId ? getProjectById(projectId) : loadProject()

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
  }, [setEdges, setNodes, projectId])

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
    // projectId가 있으면 updateProject, 없으면 saveProject (기존 호환성)
    if (projectId) {
      updateProject(projectId, { nodes: project.nodes, edges: project.edges })
    } else {
      saveProject(project)
    }
  }, [nodes, edges, projectId, loadedProject])

  const onConnect = useCallback(
    (connection: Connection) => {
      const newEdge: Edge<FlowEdgeData> = {
        ...connection,
        id: `e${connection.source}-${connection.target}`,
        type: 'step',
        markerEnd: DEFAULT_MARKER,
        data: {
          sourceType: 'manual',
          arrowType: 'forward',
          style: 'solid',
        },
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
            type: 'step',
            markerEnd: DEFAULT_MARKER,
            data: {
              sourceType: 'manual',
              arrowType: 'forward',
              style: 'solid',
            },
          }
          setEdges((eds) => addEdge(newEdge, eds))
        }
      }

      connectingNodeId.current = null
    },
    [nodes, setEdges, getClosestHandles]
  )

  // 🔥 우선순위 0: 최소한의 reconnect 구현 (복제 방지, data 보존)
  const onReconnect = useCallback(
    (oldEdge: Edge, newConnection: Connection) => {
      setEdges((edges) =>
        edges.map((edge) => {
          if (edge.id === oldEdge.id) {
            // 기존 엣지를 새 연결로 업데이트 (id도 새 연결에 맞게 변경!)
            return {
              ...edge, // 모든 속성 보존 (data, style, markerEnd, markerStart 등)
              id: `e${newConnection.source}-${newConnection.target}`, // 🔥 id 업데이트!
              source: newConnection.source,
              target: newConnection.target,
              sourceHandle: newConnection.sourceHandle,
              targetHandle: newConnection.targetHandle,
            }
          }
          return edge
        })
      )
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

  // 🔥 [Fix] 줌 단축키: Ctrl+1 (토글: 100% ↔ 전체화면), Ctrl+2 (선택 요소 핏)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        if (event.key === '1') {
          event.preventDefault()
          // 🔥 토글 로직: 현재 줌이 1(100%)이면 전체화면, 아니면 100%로
          const viewport = document.querySelector('.react-flow__viewport')
          if (viewport) {
            const transform = window.getComputedStyle(viewport).transform
            const matrix = new DOMMatrix(transform)
            const zoom = matrix.a // scale value

            if (Math.abs(zoom - 1) < 0.01) {
              // 현재 100%이면 → 전체화면
              fitView({ padding: 0.2, duration: 800 })
            } else {
              // 현재 100%가 아니면 → 100%로
              zoomTo(1, { duration: 800 })
            }
          }
        }
        if (event.key === '2') {
          event.preventDefault()
          const selectedNodes = getNodes().filter((n) => n.selected)
          if (selectedNodes.length > 0) {
            // 선택된 노드들로 핏 (padding 0.2)
            fitView({ nodes: selectedNodes, padding: 0.2, duration: 800 })
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [zoomTo, fitView, getNodes])

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
    // projectId가 있으면 updateProject, 없으면 saveProject (기존 호환성)
    if (projectId) {
      updateProject(projectId, { nodes: project.nodes, edges: project.edges })
    } else {
      saveProject(project)
    }
    alert('프로젝트가 저장되었습니다!')
  }, [nodes, edges, projectId, loadedProject])

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
    // 🔥 새로운 노드 생성 - Figma 원본 크기(absoluteBoundingBox)만 사용
    const newNode: Node<FlowNodeData> = {
      id: `node-${Date.now()}`,
      type: 'frameNode',
      position: {
        x: Math.random() * 400 + 100,
        y: Math.random() * 400 + 100,
      },
      // 🔥 CRITICAL: width와 height 모두 명시적으로 설정 (이미지 크기에 영향받지 않도록)
      style: frameData.dimensions ? {
        width: frameData.dimensions.width,
        height: frameData.dimensions.height
      } : undefined,
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
          // 🔥 CRITICAL: height도 명시적으로 설정하여 이미지 크기에 의해 노드가 커지는 것을 방지
          // absoluteBoundingBox (논리적 크기)만 사용
          style: { width: frame.width, height: frame.height },
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
        edges={edges.map((edge) => {
          const style = getEdgeStyle(edge.data)

          return {
            ...edge,
            type: 'step',
            updatable: true,
            style,
            markerEnd: getMarkerEnd(edge.data),
            markerStart: getMarkerStart(edge.data),
          } as Edge<FlowEdgeData>
        })}
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
        edgeTypes={edgeTypes}
        connectionLineType={ConnectionLineType.Step}
        defaultEdgeOptions={{
          type: 'step',
          animated: false,
          focusable: true,
          style: {
            strokeWidth: 2,
            stroke: '#555555',
            pointerEvents: 'visibleStroke' as any,  // 🔥 Fix: 선 부분만 클릭 가능
          },
          // TEST: 화살표 완전 제거
          // markerEnd: DEFAULT_MARKER,
          data: {
            sourceType: 'manual' as const,
          }
        }}
        edgesReconnectable={true}
        reconnectRadius={30}
        panOnDrag={isPanning}
        selectionOnDrag={true}  // 🔥 Fix 3: 드래그로 바로 선택
        panOnScroll={true}
        selectionMode={SelectionMode.Partial}
        selectionKeyCode={null}  // 🔥 Fix 3: 드래그하면 바로 선택 (Shift 불필요)
        multiSelectionKeyCode="Shift"  // Shift+클릭으로 추가 선택
        connectOnClick={false}
        deleteKeyCode="Delete"
        fitView
        minZoom={0.1}
        maxZoom={2}
        style={{
          cursor: isPanning ? 'grab' : 'default',
        }}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />

        {/* 🔥 [Fix 6, 7] TDSControls: left 312px, bottom 16px */}
        <TDSControls style={{ left: 312, bottom: 16 }} />

        {/* 🔥 [Fix 3, 4, 5] MiniMap: right 352px, bottom 16px */}
        <MiniMap
          nodeColor="#e2e2e2"
          maskColor="rgba(240, 240, 240, 0.6)"
          nodeStrokeWidth={3}
          zoomable
          pannable
          style={{
            position: 'absolute',
            height: 120,
            width: 200,
            bottom: 16,
            right: 352,
            margin: 0,
            border: '1px solid #E5E8EB',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.12)',
            zIndex: 5,
          }}
        />

        {/* 🔥 [Fix 3] ZoomIndicator를 MiniMap 밖으로 독립 배치 (렌더링 보장) */}
        <div style={{
          position: 'absolute',
          top: 'auto',
          bottom: 16 + 120 - 8 - 20,  // MiniMap bottom + height - top offset - indicator height
          right: 352 + 8,  // MiniMap right + right offset
          zIndex: 6,  // MiniMap보다 위
        }}>
          <ZoomIndicator />
        </div>
        <AlignmentToolbar selectedNodeIds={selectedNodeIds} />
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

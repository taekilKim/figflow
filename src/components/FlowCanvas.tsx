import { useCallback, useEffect, useState, useRef } from 'react'
import {
  ReactFlow,
  Background,
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
import { ArrowsClockwise, FloppyDisk, Export, AlignLeft, AlignCenterHorizontal, AlignRight, AlignTop, AlignCenterVertical, AlignBottom, Cloud, CloudCheck, CloudWarning } from '@phosphor-icons/react'
import FrameNode from './FrameNode'
import AddFrameDialog from './AddFrameDialog'
import FigmaFileImportDialog from './FigmaFileImportDialog'
import { PerformanceMonitor } from './PerformanceMonitor'
import { useDeviceType, isTouchDevice } from '../hooks/useDeviceType'
import { useAutoSave, formatLastSaved } from '../hooks/useAutoSave'
import { useCloudSync } from '../hooks/useCloudSync'
import { FlowNodeData, FlowEdgeData } from '../types'
import { saveProject, loadProject, getProjectById, updateProject } from '../utils/storage'
import { loadProjectFromCloud } from '../utils/cloudStorage'
import { exportCanvas, ExportFormat } from '../utils/export'
import MenuBar from './MenuBar'
import { getFigmaImages, getFigmaToken } from '../utils/figma'
import { useToast } from './Toast'
import { useDialog } from './Dialog'
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
  showMinimap?: boolean
  showSidePanels?: boolean
  onToggleSidePanels?: () => void
  onToggleMinimap?: () => void
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

function FlowCanvas({ onNodeSelect, onEdgeSelect, onSelectionChange, projectId, showMinimap = true, showSidePanels = true, onToggleSidePanels, onToggleMinimap }: FlowCanvasProps) {
  // React Flow 훅 (단축키용)
  const { zoomTo, fitView, getNodes, getViewport, setViewport } = useReactFlow()

  // Toast & Dialog
  const { showToast } = useToast()
  const { prompt: showPrompt } = useDialog()

  // 🔥 클라우드 동기화
  const { status: cloudStatus, syncToCloud } = useCloudSync()
  // 🔥 stale closure 방지를 위한 ref
  const cloudSyncRef = useRef({ cloudStatus, syncToCloud })
  useEffect(() => {
    cloudSyncRef.current = { cloudStatus, syncToCloud }
  }, [cloudStatus, syncToCloud])

  // 🔥 반응형: 디바이스 타입 감지
  const deviceType = useDeviceType()
  const isTouch = isTouchDevice()

  // 초기 로드 시 localStorage에서 데이터 복원
  // projectId가 있으면 해당 프로젝트를, 없으면 기존 방식(단일 프로젝트) 사용
  const loadedProject = projectId ? getProjectById(projectId) : loadProject()
  const [nodes, setNodes, onNodesChange] = useNodesState(
    loadedProject?.nodes || initialNodes
  )

  // Figma-style 인터랙션: 스페이스바로 패닝 모드 전환
  // 🔥 태블릿에서는 터치 제스처로 패닝
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

  // 🔥 페이지 로드 시 클라우드에서 최신 데이터 확인
  useEffect(() => {
    const checkCloudData = async () => {
      if (!cloudStatus.isEnabled || !cloudStatus.figmaUser || !projectId) {
        return
      }

      try {
        console.log('[FlowCanvas] Checking cloud for latest data...')
        const cloudProject = await loadProjectFromCloud(cloudStatus.figmaUser.id, projectId)

        if (!cloudProject) {
          console.log('[FlowCanvas] No cloud data found')
          return
        }

        const localUpdatedAt = loadedProject?.updatedAt || 0
        console.log('[FlowCanvas] Local updatedAt:', localUpdatedAt, 'Cloud updatedAt:', cloudProject.updatedAt)

        // 클라우드가 더 최신이면 상태 업데이트
        if (cloudProject.updatedAt > localUpdatedAt) {
          console.log('[FlowCanvas] ✅ Cloud data is newer, updating...')

          // 로컬에도 저장
          updateProject(projectId, cloudProject)

          // 상태 업데이트
          if (cloudProject.nodes) {
            setNodes(cloudProject.nodes as Node<FlowNodeData>[])
          }
          if (cloudProject.edges) {
            setEdges(cloudProject.edges as Edge<FlowEdgeData>[])
          }
        } else {
          console.log('[FlowCanvas] Local data is up to date')
        }
      } catch (error) {
        console.error('[FlowCanvas] Failed to check cloud data:', error)
      }
    }

    checkCloudData()
  }, [cloudStatus.isEnabled, cloudStatus.figmaUser, projectId])
  const [isFileImportDialogOpen, setIsFileImportDialogOpen] = useState(false)
  const connectingNodeId = useRef<string | null>(null)
  const [importProgress, setImportProgress] = useState<{ current: number; total: number } | null>(null)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  // 🔧 Real-time Debugging Tool - 비활성화
  // useEffect(() => {
  //   // @ts-ignore - Intentional global debug tool
  //   window.flowDebug = {
  //     check: () => {
  //       const currentEdges = getEdges()
  //       console.log('📊 총 엣지 개수:', currentEdges.length)
  //       if (currentEdges.length > 0) {
  //         console.log('🔍 첫 번째 엣지 설정:', currentEdges[0].data?.smartEdge)
  //         console.log('🎨 첫 번째 엣지 스타일:', currentEdges[0].style)
  //       } else {
  //         console.log('⚠️ 현재 연결된 엣지가 없습니다.')
  //       }
  //     },
  //     setPadding: (padding: number) => {
  //       setEdges((currentEdges) =>
  //         currentEdges.map(edge => ({
  //           ...edge,
  //           data: {
  //             ...edge.data,
  //             smartEdge: {
  //               ...(edge.data?.smartEdge || {}),
  //               nodePadding: padding
  //             }
  //           }
  //         } as Edge<FlowEdgeData>))
  //       )
  //       console.log(`✅ nodePadding을 ${padding}px로 변경했습니다.`)
  //     },
  //     setGrid: (ratio: number) => {
  //       setEdges((currentEdges) =>
  //         currentEdges.map(edge => ({
  //           ...edge,
  //           data: {
  //             ...edge.data,
  //             smartEdge: {
  //               ...(edge.data?.smartEdge || {}),
  //               gridRatio: ratio
  //             }
  //           }
  //         } as Edge<FlowEdgeData>))
  //       )
  //       console.log(`✅ gridRatio를 ${ratio}로 변경했습니다.`)
  //     },
  //     getEdges: () => {
  //       const currentEdges = getEdges()
  //       console.log('Current edges:', currentEdges)
  //       return currentEdges
  //     },
  //     getNodes: () => {
  //       console.log('Current nodes:', nodes)
  //       return nodes
  //     }
  //   }
  //   console.log('🔧 디버깅 툴 로드 완료. window.flowDebug.check()를 입력해보세요.')
  // }, [setEdges, getEdges, nodes])

  // 🔍 2단계: 런타임 진단 (실시간 상태 확인) - 비활성화
  // useEffect(() => {
  //   const diagnosisInterval = setInterval(() => {
  //     // 1. CSS 변수 주입 확인
  //     const container = document.querySelector('.flow-canvas')
  //     const computedStyle = container ? getComputedStyle(container) : null
  //     const zoomScale = computedStyle ? computedStyle.getPropertyValue('--zoom-scale') : 'Not Found'

  //     // 2. 엣지 속성 확인
  //     const currentEdges = getEdges()
  //     const firstEdge = currentEdges[0]

  //     console.log('--- 🔍 FigFlow Diagnosis ---')
  //     console.log('1. CSS --zoom-scale:', zoomScale) // 숫자가 나와야 함
  //     console.log('2. Edge Count:', currentEdges.length)

  //     if (firstEdge) {
  //       console.log('3. Edge Type:', firstEdge.type) // 'smart'여야 함
  //       console.log('4. Edge PathOptions:', (firstEdge.data as any)?.pathOptions) // offset: 50이 있어야 함
  //       console.log('5. Edge SmartEdge:', firstEdge.data?.smartEdge) // nodePadding: 60이 있어야 함
  //     }
  //     console.log('----------------------------')
  //   }, 5000) // 5초마다 진단

  //   return () => clearInterval(diagnosisInterval)
  // }, [getEdges])

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

  // 🔥 자동 저장: 10초마다 변경사항 저장 (성능 최적화)
  const { lastSaved, saveNow } = useAutoSave({
    data: { nodes, edges },
    onSave: async () => {
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

      // 🔥 클라우드 동기화 (Figma 로그인 시) - ref 사용으로 최신 상태 보장
      const { cloudStatus: currentCloudStatus, syncToCloud: currentSyncToCloud } = cloudSyncRef.current
      console.log('[AutoSave] Cloud sync enabled:', currentCloudStatus.isEnabled, 'user:', currentCloudStatus.figmaUser?.handle || 'none')
      if (currentCloudStatus.isEnabled && currentCloudStatus.figmaUser) {
        try {
          await currentSyncToCloud(project)
          console.log('[AutoSave] ✅ Project synced to cloud')
        } catch (error) {
          console.error('[AutoSave] ❌ Failed to sync to cloud:', error)
        }
      }
    },
    interval: 10000, // 10초마다 자동 저장
  })

  // 저장 상태 텍스트를 1초마다 업데이트 (상대 시간 표시용)
  const [, forceUpdate] = useState(0)
  useEffect(() => {
    const interval = setInterval(() => {
      forceUpdate(prev => prev + 1)
    }, 1000) // 1초마다 리렌더링
    return () => clearInterval(interval)
  }, [])

  // Export 핸들러
  const handleExport = useCallback(async (format: ExportFormat) => {
    setShowExportMenu(false)

    // ReactFlow 컨테이너 찾기
    const flowContainer = document.querySelector('.react-flow') as HTMLElement
    if (!flowContainer) {
      showToast('내보낼 캔버스를 찾을 수 없습니다.', 'error')
      return
    }

    setIsExporting(true)
    try {
      // 1. 현재 뷰포트 상태 저장
      const currentViewport = getViewport()

      // 2. 모든 노드가 보이도록 fitView 호출
      fitView({ padding: 0.1, duration: 0 })

      // 3. fitView 완료 및 이미지 렌더링 대기 (더 긴 대기 시간)
      await new Promise(resolve => setTimeout(resolve, 500))

      // 4. 캡처
      const filename = loadedProject?.name || 'figflow-export'
      await exportCanvas(flowContainer, format, { filename, scale: 2 })

      // 5. 원래 뷰포트로 복원
      setViewport(currentViewport, { duration: 0 })
    } catch (error) {
      console.error('Export failed:', error)
      showToast('내보내기에 실패했습니다.', 'error')
    } finally {
      setIsExporting(false)
    }
  }, [loadedProject?.name, getViewport, setViewport, fitView])

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
      setEdges((eds) => {
        const updatedEdges = addEdge(newEdge, eds)
        // 즉시 storage에 저장 (RightPanel에서 바로 편집 가능하도록)
        const project = projectId ? getProjectById(projectId) : loadProject()
        if (project) {
          const edgesToSave = updatedEdges.map(e => ({
            id: e.id,
            source: e.source,
            target: e.target,
            sourceHandle: e.sourceHandle,
            targetHandle: e.targetHandle,
            type: e.type,
            label: typeof e.label === 'string' ? e.label : undefined,
            data: e.data || { sourceType: 'manual' as const, arrowType: 'forward' as const, style: 'solid' as const },
          }))
          if (projectId) {
            updateProject(projectId, { edges: edgesToSave })
          } else {
            saveProject({ ...project, edges: edgesToSave, updatedAt: Date.now() })
          }
        }
        return updatedEdges
      })
      connectingNodeId.current = null
    },
    [setEdges, projectId]
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
      // 🔥 재연결 중이면 스킵 (onReconnect가 이미 처리함)
      if (isReconnecting.current) {
        connectingNodeId.current = null
        return
      }

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
          setEdges((eds) => {
            const updatedEdges = addEdge(newEdge, eds)
            // 즉시 storage에 저장
            const project = projectId ? getProjectById(projectId) : loadProject()
            if (project) {
              const edgesToSave = updatedEdges.map(e => ({
                id: e.id,
                source: e.source,
                target: e.target,
                sourceHandle: e.sourceHandle,
                targetHandle: e.targetHandle,
                type: e.type,
                label: typeof e.label === 'string' ? e.label : undefined,
                data: e.data || { sourceType: 'manual' as const, arrowType: 'forward' as const, style: 'solid' as const },
              }))
              if (projectId) {
                updateProject(projectId, { edges: edgesToSave })
              } else {
                saveProject({ ...project, edges: edgesToSave, updatedAt: Date.now() })
              }
            }
            return updatedEdges
          })
        }
      }

      connectingNodeId.current = null
    },
    [nodes, setEdges, getClosestHandles, projectId]
  )

  // 🔥 재연결 추적 (onConnectEnd와 onReconnect 충돌 방지)
  const isReconnecting = useRef(false)

  // 🔥 재연결 정보 저장 (onReconnect가 호출되지 않을 때 수동 처리용)
  const reconnectInfo = useRef<{
    oldEdge: Edge<FlowEdgeData>
    newConnection: Connection | null
    handleType: 'source' | 'target'
  } | null>(null)

  const onReconnectStart = useCallback((_event: React.MouseEvent, edge: Edge, handleType: 'source' | 'target') => {
    console.log('🔵 [onReconnectStart] 재연결 시작')
    console.log('  - 드래그 중인 핸들:', handleType, '(source=시작지, target=목적지)')
    console.log('  - 재연결 대상 edge:', {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
    })
    isReconnecting.current = true

    // 재연결 정보 저장
    reconnectInfo.current = {
      oldEdge: edge as Edge<FlowEdgeData>,
      newConnection: null,
      handleType,
    }
  }, [])

  // 🔥 우선순위 0: React Flow 공식 reconnectEdge 사용 + data 보존 + 자동 handle 선택
  const onReconnect = useCallback(
    (oldEdge: Edge, newConnection: Connection) => {
      console.log('🟢 [onReconnect] 재연결 시작')
      console.log('  - oldEdge:', {
        id: oldEdge.id,
        source: oldEdge.source,
        target: oldEdge.target,
        sourceHandle: oldEdge.sourceHandle,
        targetHandle: oldEdge.targetHandle,
        data: oldEdge.data,
      })
      console.log('  - newConnection (원본):', newConnection)

      // onReconnect가 정상 호출되었으므로 reconnectInfo 초기화
      reconnectInfo.current = null

      // 🔥 노드가 바뀌었을 때만 자동 handle 선택
      const sourceChanged = oldEdge.source !== newConnection.source
      const targetChanged = oldEdge.target !== newConnection.target
      const nodeChanged = sourceChanged || targetChanged

      let finalConnection = newConnection
      if (nodeChanged) {
        // 다른 노드로 옮길 때 → 자동 handle 선택
        const sourceNode = nodes.find((n) => n.id === newConnection.source)
        const targetNode = nodes.find((n) => n.id === newConnection.target)

        if (sourceNode && targetNode) {
          const { sourceHandle, targetHandle } = getClosestHandles(sourceNode, targetNode)
          finalConnection = {
            ...newConnection,
            sourceHandle,
            targetHandle,
          }
          console.log('  - 다른 노드로 옮김 → 자동 handle 선택:', finalConnection)
        }
      } else {
        // 같은 노드 내에서 handle 변경 → 사용자 의도 존중
        console.log('  - 같은 노드 내 handle 변경 → 사용자 선택 유지:', newConnection)
      }

      setEdges((els) => {
        console.log('  - 현재 edges 개수:', els.length)
        console.log('  - 현재 edges IDs:', els.map((e) => e.id))

        // React Flow 공식 reconnectEdge 사용
        const reconnected = reconnectEdge(oldEdge, finalConnection, els)
        console.log('  - reconnectEdge 반환값 개수:', reconnected.length)
        console.log('  - reconnectEdge 반환값 IDs:', reconnected.map((e) => e.id))

        // 새로 생성된 엣지에 oldEdge의 속성 복사
        const result = reconnected.map((edge) => {
          // 새 엣지 감지: 이전 배열에 없던 id
          const isNewEdge = !els.find((e) => e.id === edge.id)

          if (isNewEdge) {
            console.log('  - 새 엣지 감지:', edge.id, '(oldEdge:', oldEdge.id, ')')
            // 새 엣지에 oldEdge의 모든 속성 복사
            return {
              ...edge,
              data: (oldEdge as Edge<FlowEdgeData>).data,
              style: oldEdge.style,
              label: oldEdge.label,
              markerEnd: oldEdge.markerEnd,
              markerStart: oldEdge.markerStart,
              type: oldEdge.type,
            } as Edge<FlowEdgeData>
          }
          return edge as Edge<FlowEdgeData>
        }) as Edge<FlowEdgeData>[]

        console.log('  - 최종 반환 edges 개수:', result.length)
        console.log('  - 최종 반환 edges IDs:', result.map((e) => e.id))
        console.log('  - 최종 반환 edges 상세:', result.map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle: e.sourceHandle,
          targetHandle: e.targetHandle,
        })))

        return result
      })
    },
    [setEdges, nodes, getClosestHandles]
  )

  const onReconnectEnd = useCallback(() => {
    console.log('🟡 [onReconnectEnd] 재연결 종료')

    // onReconnect가 호출되지 않았으면 수동으로 재연결 실행
    if (reconnectInfo.current && reconnectInfo.current.newConnection) {
      const { oldEdge, newConnection } = reconnectInfo.current
      console.log('🔴 [MANUAL RECONNECT] onReconnect가 호출되지 않아 수동 재연결 실행')
      console.log('  - oldEdge:', oldEdge.id)
      console.log('  - newConnection (원본):', newConnection)

      // 🔥 노드가 바뀌었을 때만 자동 handle 선택
      const sourceChanged = oldEdge.source !== newConnection.source
      const targetChanged = oldEdge.target !== newConnection.target
      const nodeChanged = sourceChanged || targetChanged

      let finalConnection = newConnection
      if (nodeChanged) {
        // 다른 노드로 옮길 때 → 자동 handle 선택
        const sourceNode = nodes.find((n) => n.id === newConnection.source)
        const targetNode = nodes.find((n) => n.id === newConnection.target)

        if (sourceNode && targetNode) {
          const { sourceHandle, targetHandle } = getClosestHandles(sourceNode, targetNode)
          finalConnection = {
            ...newConnection,
            sourceHandle,
            targetHandle,
          }
          console.log('  - 수동 재연결: 다른 노드로 옮김 → 자동 handle 선택:', finalConnection)
        }
      } else {
        // 같은 노드 내에서 handle 변경 → 사용자 의도 존중
        console.log('  - 수동 재연결: 같은 노드 내 handle 변경 → 사용자 선택 유지:', newConnection)
      }

      setEdges((els) => {
        // React Flow 공식 reconnectEdge 사용
        const reconnected = reconnectEdge(oldEdge, finalConnection, els)

        // 새로 생성된 엣지에 oldEdge의 속성 복사
        const result = reconnected.map((edge) => {
          const isNewEdge = !els.find((e) => e.id === edge.id)

          if (isNewEdge) {
            const newEdge = {
              ...edge,
              data: oldEdge.data,
              style: oldEdge.style,
              label: oldEdge.label,
              markerEnd: oldEdge.markerEnd,
              markerStart: oldEdge.markerStart,
              type: oldEdge.type,
              updatable: true,  // 🔥 명시적으로 updatable 설정
            } as Edge<FlowEdgeData> & { updatable: boolean }

            console.log('  - 새 edge 생성:', {
              id: newEdge.id,
              source: newEdge.source,
              target: newEdge.target,
              sourceHandle: newEdge.sourceHandle,
              targetHandle: newEdge.targetHandle,
              updatable: (newEdge as any).updatable,
              markerEnd: newEdge.markerEnd,
              markerStart: newEdge.markerStart,
            })

            return newEdge
          }
          return edge as Edge<FlowEdgeData>
        }) as Edge<FlowEdgeData>[]

        console.log('  - 수동 재연결 완료. 새 edge ID:', result.find(e => !els.find(old => old.id === e.id))?.id)
        return result
      })
    }

    // 재연결 완료 후 플래그 및 info 리셋
    isReconnecting.current = false
    reconnectInfo.current = null
  }, [setEdges, nodes, getClosestHandles])

  // 🔥 우선순위 0: 모든 재연결 허용 (validation 우회)
  const isValidConnection = useCallback((connection: Edge<FlowEdgeData> | Connection) => {
    console.log('🟣 [isValidConnection] 연결 검증:', connection)

    // 재연결 중이면 마지막 connection 정보 저장
    if (reconnectInfo.current) {
      reconnectInfo.current.newConnection = connection as Connection
    }

    // 모든 연결 허용
    return true
  }, [])


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

  // 🔥 줌 단축키: Cmd+0 (100%), Cmd+1 (전체 보기), Cmd+2 (선택 요소 핏)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        // Cmd+0: 100%로 줌 초기화
        if (event.key === '0') {
          event.preventDefault()
          zoomTo(1, { duration: 800 })
        }
        // Cmd+1: 전체 보기
        if (event.key === '1') {
          event.preventDefault()
          fitView({ padding: 0.1, duration: 800 })
        }
        // Cmd+2: 선택 프레임에 맞추기
        if (event.key === '2') {
          event.preventDefault()
          const selectedNodes = getNodes().filter((n) => n.selected)
          if (selectedNodes.length > 0) {
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
    saveNow() // 자동 저장 훅의 즉시 저장 함수 호출
    showToast('프로젝트가 저장되었습니다!', 'success')
  }, [saveNow])

  const handleSync = useCallback(async () => {
    const token = getFigmaToken()

    if (!token) {
      const userToken = await showPrompt('Figma Personal Access Token을 입력하세요:', '', 'Figma 토큰 입력')
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

      // 각 파일에 대해 이미지 가져오기 (저해상도 + 고해상도)
      const updates: Array<{ nodeIndex: number; thumbnailUrl: string; thumbnailUrlLowRes: string }> = []

      for (const [fileKey, fileNodes] of nodesByFile) {
        const nodeIds = fileNodes.map((n) => n.nodeId)

        // 🔥 병렬로 저해상도(scale=0.5)와 고해상도(scale=1) 썸네일 가져오기
        const [resultsLowRes, resultsHighRes] = await Promise.all([
          getFigmaImages(finalToken, { fileKey, nodeIds, scale: 0.5 }),
          getFigmaImages(finalToken, { fileKey, nodeIds, scale: 1 }),
        ])

        resultsHighRes.forEach((result, idx) => {
          if (result.imageUrl) {
            const nodeIndex = nodes.findIndex((n) => n.id === fileNodes[idx].node.id)
            const lowResUrl = resultsLowRes[idx]?.imageUrl
            if (nodeIndex !== -1 && lowResUrl) {
              updates.push({
                nodeIndex,
                thumbnailUrl: result.imageUrl,
                thumbnailUrlLowRes: lowResUrl,
              })
            }
          }
        })
      }

      // 노드 업데이트
      if (updates.length > 0) {
        const updatedNodes = [...nodes]
        updates.forEach(({ nodeIndex, thumbnailUrl, thumbnailUrlLowRes }) => {
          const node = updatedNodes[nodeIndex]
          const data = node.data as FlowNodeData
          updatedNodes[nodeIndex] = {
            ...node,
            data: {
              ...data,
              meta: {
                ...data.meta,
                thumbnailUrl,
                thumbnailUrlLowRes,
                lastSyncedAt: Date.now(),
              },
            },
          }
        })
        setNodes(updatedNodes)
        showToast(`${updates.length}개의 썸네일이 업데이트되었습니다!`, 'success')
      } else {
        showToast('업데이트된 썸네일이 없습니다.', 'info')
      }
    } catch (error) {
      console.error('Sync failed:', error)
      showToast('싱크 실패: ' + (error instanceof Error ? error.message : '알 수 없는 오류'), 'error')
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

    // 🔥 중요 액션: 노드 추가 후 즉시 저장
    saveNow()

    showToast(`"${frameData.title}" 프레임이 추가되었습니다!`, 'success')
  }, [setNodes, saveNow])

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
      showToast('Figma Access Token이 설정되지 않았습니다.', 'error')
      return
    }

    // 다이얼로그 닫기
    setIsFileImportDialogOpen(false)

    try {
      // 진행도 초기화
      setImportProgress({ current: 0, total: selectedFrames.length })

      console.log('Fetching images...')

      // 각 프레임을 개별적으로 처리하여 진행도 표시 (저해상도 + 고해상도)
      const imageResults: Array<{ nodeId: string; imageUrl: string | null; imageUrlLowRes: string | null }> = []

      for (let i = 0; i < selectedFrames.length; i++) {
        const frame = selectedFrames[i]
        setImportProgress({ current: i + 1, total: selectedFrames.length })

        // 🔥 병렬로 저해상도(scale=0.5)와 고해상도(scale=1) 썸네일 가져오기
        const [resultLowRes, resultHighRes] = await Promise.all([
          getFigmaImages(accessToken, {
            fileKey,
            nodeIds: [frame.nodeId],
            scale: 0.5,
          }),
          getFigmaImages(accessToken, {
            fileKey,
            nodeIds: [frame.nodeId],
            scale: 1,
          }),
        ])

        if (resultHighRes[0]) {
          imageResults.push({
            nodeId: frame.nodeId,
            imageUrl: resultHighRes[0].imageUrl,
            imageUrlLowRes: resultLowRes[0]?.imageUrl || null,
          })
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

        const imageResult = imageResults.find(r => r.nodeId === frame.nodeId)
        const thumbnailUrl = imageResult?.imageUrl
        const thumbnailUrlLowRes = imageResult?.imageUrlLowRes

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
              thumbnailUrlLowRes: thumbnailUrlLowRes || undefined,
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

      // 🔥 중요 액션: 파일 import 완료 후 즉시 저장
      saveNow()

      showToast(`${selectedFrames.length}개의 프레임이 추가되었습니다!`, 'success')
    } catch (error) {
      console.error('Batch import failed:', error)
      setImportProgress(null)
      showToast('프레임 가져오기 실패: ' + (error instanceof Error ? error.message : '알 수 없는 오류'), 'error')
    }
  }, [setNodes, saveNow])

  return (
    <>
      <MenuBar
        onSave={handleSave}
        onSync={handleSync}
        onAddFrame={() => setIsAddDialogOpen(true)}
        onImportFile={() => setIsFileImportDialogOpen(true)}
        projectName={loadedProject?.name}
        isSyncing={isSyncing}
        showSidePanels={showSidePanels}
        showMinimap={showMinimap}
        onToggleSidePanels={onToggleSidePanels}
        onToggleMinimap={onToggleMinimap}
      />
      <div className="toolbar">
        <button
          className="toolbar-button"
          onClick={handleSync}
          disabled={isSyncing}
        >
          <ArrowsClockwise size={20} weight="bold" />
          {isSyncing ? '동기화 중...' : '동기화'}
        </button>
        <button className="toolbar-button" onClick={handleSave}>
          <FloppyDisk size={20} weight="bold" />
          저장
        </button>
        <span style={{
          fontSize: '12px',
          color: '#666',
          marginLeft: '8px',
          alignSelf: 'center',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          <span>{formatLastSaved(lastSaved)}</span>
          {cloudStatus.isEnabled && cloudStatus.figmaUser && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {cloudStatus.isSyncing ? (
                <>
                  <Cloud size={14} weight="bold" />
                  <span>동기화 중...</span>
                </>
              ) : cloudStatus.error ? (
                <>
                  <CloudWarning size={14} weight="bold" color="#ff4444" />
                  <span style={{ color: '#ff4444' }}>동기화 실패</span>
                </>
              ) : cloudStatus.lastSynced ? (
                <>
                  <CloudCheck size={14} weight="bold" color="#4CAF50" />
                  <span style={{ color: '#4CAF50' }}>클라우드 저장됨</span>
                </>
              ) : null}
            </span>
          )}
        </span>
        <div className="export-button-wrapper">
          <button
            className="toolbar-button"
            onClick={() => setShowExportMenu(!showExportMenu)}
            disabled={isExporting}
          >
            <Export size={20} weight="bold" />
            {isExporting ? '내보내는 중...' : '내보내기'}
          </button>
          {showExportMenu && (
            <div className="export-menu">
              <button onClick={() => handleExport('png')}>PNG로 내보내기</button>
              <button onClick={() => handleExport('jpg')}>JPG로 내보내기</button>
              <button onClick={() => handleExport('pdf')}>PDF로 내보내기</button>
            </div>
          )}
        </div>
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
            updatable: true,  // 🔥 양쪽 모두 재연결 가능
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
        onReconnectStart={onReconnectStart}
        onReconnectEnd={onReconnectEnd}
        isValidConnection={isValidConnection}
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
        reconnectRadius={200}  // 🔥 재연결 인식 범위 대폭 확대 (프레임 전체 인식)
        connectionRadius={200}  // 🔥 연결 인식 범위 대폭 확대
        panOnDrag={
          deviceType === 'tablet' && isTouch
            ? [2]  // 🔥 태블릿: 두 손가락으로 패닝
            : deviceType === 'mobile'
            ? true  // 🔥 모바일: 드래그로 패닝 (열람 모드)
            : isPanning  // 🔥 데스크탑: 스페이스바 패닝
        }
        selectionOnDrag={deviceType !== 'mobile'}  // 🔥 모바일에서는 선택 드래그 비활성화
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
        onlyRenderVisibleElements={true}
        nodesDraggable={deviceType !== 'mobile'}
        nodesConnectable={deviceType !== 'mobile'}
        elevateNodesOnSelect={false}
        autoPanOnNodeDrag={deviceType === 'desktop'}
        zoomOnDoubleClick={deviceType !== 'mobile'}
        // 🔥 성능 최적화: 불필요한 인터랙션 비활성화
        edgesFocusable={false}
        elevateEdgesOnSelect={false}
        selectNodesOnDrag={false}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />

        {/* TDSControls: 좌측 하단 (사이드패널 상태에 따라 위치 조정) */}
        <TDSControls style={{ left: showSidePanels ? 272 : 16, bottom: 16 }} />

        {/* MiniMap: 모바일에서 숨김, showMinimap 토글 */}
        {deviceType !== 'mobile' && showMinimap && (
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
            right: showSidePanels ? 312 : 16,
            margin: 0,
            border: '1px solid #E5E8EB',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.12)',
            zIndex: 5,
          }}
        />
        )}

        {/* ZoomIndicator: MiniMap 우상단 모서리 */}
        {deviceType !== 'mobile' && showMinimap && (
        <div style={{
          position: 'absolute',
          bottom: 16 + 120 - 6 - 24,  // MiniMap 상단에서 6px 아래
          right: (showSidePanels ? 312 : 16) + 6,  // MiniMap 우측에서 6px 안쪽
          zIndex: 6,
        }}>
          <ZoomIndicator />
        </div>
        )}
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

      {/* 🔥 성능 모니터링 (개발 모드에서만 표시) */}
      <PerformanceMonitor />
    </>
  )
}

export default FlowCanvas

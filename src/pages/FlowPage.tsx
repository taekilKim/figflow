import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ReactFlowProvider } from '@xyflow/react'
import FlowCanvas from '../components/FlowCanvas'
import LeftPanel from '../components/LeftPanel'
import RightPanel from '../components/RightPanel'
import { getProjectById } from '../utils/storage'
import '../styles/App.css'

function FlowPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([])
  const [projectLoaded, setProjectLoaded] = useState(false)

  useEffect(() => {
    // 프로젝트 ID가 있으면 로드
    if (id) {
      const project = getProjectById(id)
      if (!project) {
        // 프로젝트를 찾을 수 없으면 워크스페이스로 리다이렉트
        alert('프로젝트를 찾을 수 없습니다.')
        navigate('/workspace')
        return
      }
      setProjectLoaded(true)
    } else {
      setProjectLoaded(true)
    }
  }, [id, navigate])

  if (!projectLoaded) {
    return (
      <div className="app-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p>로딩 중...</p>
      </div>
    )
  }

  return (
    <ReactFlowProvider>
      <div className="app-container">
        <LeftPanel selectedNodeIds={selectedNodeIds} projectId={id} />
        <FlowCanvas
          onNodeSelect={setSelectedNodeId}
          onEdgeSelect={setSelectedEdgeId}
          onSelectionChange={setSelectedNodeIds}
          projectId={id}
        />
        <RightPanel
          selectedNodeId={selectedNodeId}
          selectedEdgeId={selectedEdgeId}
          projectId={id}
        />
      </div>
    </ReactFlowProvider>
  )
}

export default FlowPage

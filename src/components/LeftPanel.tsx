import { useState, useEffect } from 'react'
import { MagnifyingGlass, FrameCorners } from '@phosphor-icons/react'
import { useReactFlow } from '@xyflow/react'
import { loadProject, getProjectById } from '../utils/storage'
import { FlowNodeData } from '../types'
import '../styles/LeftPanel.css'

interface LeftPanelProps {
  selectedNodeIds: string[]
  projectId?: string
}

function LeftPanel({ selectedNodeIds, projectId }: LeftPanelProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [nodes, setNodes] = useState<Array<{ id: string; data: FlowNodeData }>>([])
  const { setNodes: setFlowNodes } = useReactFlow()

  // localStorage에서 노드 목록 불러오기
  useEffect(() => {
    const loadNodes = () => {
      const project = projectId ? getProjectById(projectId) : loadProject()
      if (project?.nodes) {
        setNodes(project.nodes)
      }
    }

    // 초기 로드
    loadNodes()

    // storage 이벤트 리스너 (다른 탭/컴포넌트에서 변경 시)
    window.addEventListener('storage', loadNodes)

    // 주기적으로 업데이트 체크 (같은 탭 내 변경사항 반영)
    const interval = setInterval(loadNodes, 1000)

    return () => {
      window.removeEventListener('storage', loadNodes)
      clearInterval(interval)
    }
  }, [projectId])

  // 패널에서 노드 클릭 시 캔버스의 선택 상태 업데이트
  const handleSelectNode = (nodeId: string, event: React.MouseEvent) => {
    const isMulti = event.metaKey || event.ctrlKey || event.shiftKey

    setFlowNodes((prevNodes) =>
      prevNodes.map((node) => {
        if (node.id === nodeId) {
          return { ...node, selected: true }
        }
        // 다중 선택이 아니면 나머지는 선택 해제
        return isMulti ? node : { ...node, selected: false }
      })
    )
  }

  const filteredNodes = nodes.filter((node) =>
    node.data.meta.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="left-panel">
      <div className="panel-header">
        <h2>프레임 목록</h2>
        <span className="frame-count">{nodes.length}</span>
      </div>

      <div className="search-bar">
        <div style={{ position: 'relative' }}>
          <MagnifyingGlass
            size={20}
            weight="bold"
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--grey-600)',
              pointerEvents: 'none'
            }}
          />
          <input
            type="text"
            placeholder="프레임 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
            style={{ paddingLeft: '40px' }}
          />
        </div>
      </div>

      <div className="panel-content">
        {filteredNodes.length === 0 ? (
          <div className="empty-state">
            <p>{searchQuery ? '검색 결과가 없습니다.' : '아직 추가된 프레임이 없습니다.'}</p>
            <p className="empty-state-hint">
              {!searchQuery && (
                <>
                  Figma 프레임을 추가하려면<br />
                  상단의 "프레임 추가" 버튼을 클릭하세요.
                </>
              )}
            </p>
          </div>
        ) : (
          <div className="frame-list">
            {filteredNodes.map((node) => (
              <div
                key={node.id}
                className="frame-item"
                onClick={(e) => handleSelectNode(node.id, e)}
                style={{
                  background: selectedNodeIds.includes(node.id) ? 'var(--blue-100)' : 'transparent',
                  borderLeft: selectedNodeIds.includes(node.id) ? '3px solid var(--blue-500)' : '3px solid transparent'
                }}
              >
                {node.data.meta.thumbnailUrl ? (
                  <div className="frame-item-thumbnail">
                    <img src={node.data.meta.thumbnailUrl} alt={node.data.meta.title} />
                  </div>
                ) : (
                  <div className="frame-item-thumbnail" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FrameCorners size={24} weight="bold" color="var(--grey-500)" />
                  </div>
                )}
                <div className="frame-item-content">
                  <h3 className="frame-item-title">{node.data.meta.title}</h3>
                  {node.data.meta.status && (
                    <span className={`frame-item-status status-${node.data.meta.status}`}>
                      {node.data.meta.status}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default LeftPanel

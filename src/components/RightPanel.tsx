import { useState, useEffect } from 'react'
import { loadProject, saveProject, getProjectById, updateProject } from '../utils/storage'
import { EdgeStyle, ArrowType, FlowEdgeData } from '../types'
import { loadPresets, addPreset, deletePreset } from '../utils/edgePresets'
import '../styles/RightPanel.css'

interface RightPanelProps {
  selectedNodeId: string | null
  selectedEdgeId: string | null
  projectId?: string
}

function RightPanel({ selectedNodeId, selectedEdgeId, projectId }: RightPanelProps) {
  const [edgeData, setEdgeData] = useState<FlowEdgeData | null>(null)
  const [edgeLabel, setEdgeLabel] = useState('')
  const [presets, setPresets] = useState(loadPresets())
  const [newPresetName, setNewPresetName] = useState('')
  const [nodeTitle, setNodeTitle] = useState('')
  const [nodeStatus, setNodeStatus] = useState('draft')
  const [nodeNotes, setNodeNotes] = useState('')

  // 선택된 노드의 데이터 로드
  useEffect(() => {
    if (!selectedNodeId) {
      setNodeTitle('')
      setNodeStatus('draft')
      setNodeNotes('')
      return
    }

    const project = projectId ? getProjectById(projectId) : loadProject()
    if (project?.nodes) {
      const node = project.nodes.find((n) => n.id === selectedNodeId)
      if (node && node.data?.meta) {
        setNodeTitle(node.data.meta.title || '')
        setNodeStatus(node.data.meta.status || 'draft')
        setNodeNotes(node.data.meta.notes || '')
      }
    }
  }, [selectedNodeId, projectId])

  // 선택된 엣지의 데이터 로드
  useEffect(() => {
    if (!selectedEdgeId) {
      setEdgeData(null)
      return
    }

    const project = projectId ? getProjectById(projectId) : loadProject()
    if (project?.edges) {
      const edge = project.edges.find((e) => e.id === selectedEdgeId)
      if (edge) {
        setEdgeData(edge.data || { sourceType: 'manual' })
        setEdgeLabel(edge.label || '')
      }
    }
  }, [selectedEdgeId, projectId])

  // 노드 속성 업데이트
  const updateNode = (updates: {
    title?: string
    status?: 'draft' | 'review' | 'approved' | 'deprecated'
    notes?: string
  }) => {
    if (!selectedNodeId) return

    const project = projectId ? getProjectById(projectId) : loadProject()
    if (!project) return

    const nodeIndex = project.nodes.findIndex((n) => n.id === selectedNodeId)
    if (nodeIndex === -1) return

    const updatedNodes = [...project.nodes]
    const node = updatedNodes[nodeIndex]

    updatedNodes[nodeIndex] = {
      ...node,
      data: {
        ...node.data,
        meta: {
          ...node.data.meta,
          ...updates,
        },
      },
    }

    if (projectId) {
      updateProject(projectId, { nodes: updatedNodes })
    } else {
      saveProject({ ...project, nodes: updatedNodes, updatedAt: Date.now() })
    }
    window.dispatchEvent(new Event('storage'))

    if (updates.title !== undefined) setNodeTitle(updates.title)
    if (updates.status !== undefined) setNodeStatus(updates.status)
    if (updates.notes !== undefined) setNodeNotes(updates.notes)
  }

  // 프리셋 적용
  const applyPreset = (presetId: string) => {
    const preset = presets.find((p) => p.id === presetId)
    if (preset) {
      updateEdge({
        style: preset.style,
        arrowType: preset.arrowType,
        color: preset.color,
      })
    }
  }

  // 현재 스타일을 프리셋으로 저장
  const saveAsPreset = () => {
    if (!newPresetName.trim() || !edgeData) return

    const newPreset = {
      id: `preset-${Date.now()}`,
      name: newPresetName.trim(),
      style: edgeData.style || 'solid',
      arrowType: edgeData.arrowType || 'forward',
      color: edgeData.color || '#b0b0b0',
    }

    addPreset(newPreset)
    setPresets(loadPresets())
    setNewPresetName('')
  }

  // 프리셋 삭제
  const handleDeletePreset = (presetId: string) => {
    if (confirm('이 프리셋을 삭제하시겠습니까?')) {
      deletePreset(presetId)
      setPresets(loadPresets())
    }
  }

  // 엣지 속성 업데이트
  const updateEdge = (updates: Partial<FlowEdgeData> | { label?: string }) => {
    if (!selectedEdgeId) return

    const project = projectId ? getProjectById(projectId) : loadProject()
    if (!project) return

    const edgeIndex = project.edges.findIndex((e) => e.id === selectedEdgeId)
    if (edgeIndex === -1) return

    const updatedEdges = [...project.edges]
    const edge = updatedEdges[edgeIndex]

    if ('label' in updates) {
      updatedEdges[edgeIndex] = { ...edge, label: updates.label }
      setEdgeLabel(updates.label || '')
    } else {
      updatedEdges[edgeIndex] = {
        ...edge,
        data: { ...edge.data, ...updates },
      }
      setEdgeData({ ...edge.data, ...updates })
    }

    if (projectId) {
      updateProject(projectId, { edges: updatedEdges })
    } else {
      saveProject({ ...project, edges: updatedEdges, updatedAt: Date.now() })
    }

    // 변경사항을 즉시 반영하기 위해 storage 이벤트 발생
    window.dispatchEvent(new Event('storage'))
  }
  if (!selectedNodeId && !selectedEdgeId) {
    return (
      <div className="right-panel">
        <div className="panel-header">
          <h2>속성</h2>
        </div>
        <div className="panel-content">
          <div className="empty-state">
            <p>선택된 항목이 없습니다.</p>
            <p className="empty-state-hint">
              노드 또는 연결선을 선택하면<br />
              속성을 편집할 수 있습니다.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="right-panel">
      <div className="panel-header">
        <h2>속성</h2>
      </div>
      <div className="panel-content">
        {selectedNodeId && (
          <div className="inspector-section">
            <h3 className="inspector-title">노드 정보</h3>
            <div className="inspector-field">
              <label>제목</label>
              <input
                type="text"
                placeholder="프레임 제목"
                value={nodeTitle}
                onChange={(e) => updateNode({ title: e.target.value })}
              />
            </div>
            <div className="inspector-field">
              <label>상태</label>
              <select
                value={nodeStatus}
                onChange={(e) =>
                  updateNode({
                    status: e.target.value as 'draft' | 'review' | 'approved' | 'deprecated',
                  })
                }
              >
                <option value="draft">초안</option>
                <option value="review">검토 중</option>
                <option value="approved">승인됨</option>
                <option value="deprecated">사용 중지</option>
              </select>
            </div>
            <div className="inspector-field">
              <label>메모</label>
              <textarea
                rows={4}
                placeholder="메모를 입력하세요..."
                value={nodeNotes}
                onChange={(e) => updateNode({ notes: e.target.value })}
              />
            </div>
          </div>
        )}

        {selectedEdgeId && edgeData && (
          <div className="inspector-section">
            <h3 className="inspector-title">연결선 정보</h3>

            <div className="inspector-field">
              <label>라벨</label>
              <input
                type="text"
                placeholder="연결선 라벨"
                value={edgeLabel}
                onChange={(e) => updateEdge({ label: e.target.value })}
              />
            </div>

            <div className="inspector-field">
              <label>스타일</label>
              <select
                value={edgeData.style || 'solid'}
                onChange={(e) => updateEdge({ style: e.target.value as EdgeStyle })}
              >
                <option value="solid">실선 (Solid)</option>
                <option value="dashed">대시 (Dashed)</option>
                <option value="dotted">점선 (Dotted)</option>
              </select>
            </div>

            <div className="inspector-field">
              <label>화살표</label>
              <select
                value={edgeData.arrowType || 'forward'}
                onChange={(e) => updateEdge({ arrowType: e.target.value as ArrowType })}
              >
                <option value="none">없음</option>
                <option value="forward">앞으로 (→)</option>
                <option value="backward">뒤로 (←)</option>
                <option value="both">양방향 (↔)</option>
              </select>
            </div>

            <div className="inspector-field">
              <label>색상</label>
              <div className="color-picker-group">
                <input
                  type="color"
                  value={edgeData.color || '#b0b0b0'}
                  onChange={(e) => updateEdge({ color: e.target.value })}
                  className="color-picker"
                />
                <input
                  type="text"
                  value={edgeData.color || '#b0b0b0'}
                  onChange={(e) => updateEdge({ color: e.target.value })}
                  placeholder="#b0b0b0"
                  className="color-input"
                />
              </div>
            </div>

            <div className="inspector-field">
              <label>소스 타입</label>
              <select
                value={edgeData.sourceType || 'manual'}
                onChange={(e) => updateEdge({ sourceType: e.target.value as any })}
              >
                <option value="auto">자동 (Figma 프로토타입)</option>
                <option value="inferred">추론</option>
                <option value="manual">수동</option>
              </select>
            </div>

            <div className="inspector-divider" />

            <h3 className="inspector-title">프리셋</h3>

            <div className="preset-grid">
              {presets.map((preset) => (
                <div
                  key={preset.id}
                  className="preset-item"
                  onClick={() => applyPreset(preset.id)}
                >
                  <div className="preset-preview">
                    <div
                      className="preset-line"
                      style={{
                        borderTop: `3px ${preset.style} ${preset.color}`,
                      }}
                    />
                  </div>
                  <div className="preset-name">{preset.name}</div>
                  {!preset.id.startsWith('default') && !preset.id.startsWith('success') &&
                   !preset.id.startsWith('error') && !preset.id.startsWith('bidirectional') &&
                   !preset.id.startsWith('optional') && (
                    <button
                      className="preset-delete"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeletePreset(preset.id)
                      }}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="inspector-field">
              <label>현재 스타일 저장</label>
              <div className="preset-save-group">
                <input
                  type="text"
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  placeholder="프리셋 이름"
                  className="preset-name-input"
                />
                <button
                  className="btn-save-preset"
                  onClick={saveAsPreset}
                  disabled={!newPresetName.trim()}
                >
                  저장
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default RightPanel

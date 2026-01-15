import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Lightning, Trash, FolderOpen, Export, FileArrowUp } from '@phosphor-icons/react'
import {
  getAllProjects,
  createProject,
  deleteProject,
  exportProject,
  importProject,
  setCurrentProjectId,
} from '../utils/storage'
import { getFigmaToken, saveFigmaToken, clearFigmaToken } from '../utils/figma'
import { startFigmaOAuth, isOAuthAvailable } from '../utils/figmaAuth'
import { ProjectData } from '../types'
import '../styles/WorkspacePage.css'

function WorkspacePage() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState<ProjectData[]>([])
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [figmaToken, setFigmaToken] = useState<string | null>(null)

  useEffect(() => {
    loadProjects()
    setFigmaToken(getFigmaToken())
  }, [])

  const loadProjects = () => {
    const allProjects = getAllProjects()
    // 최근 수정순으로 정렬
    allProjects.sort((a, b) => b.updatedAt - a.updatedAt)
    setProjects(allProjects)
  }

  const handleCreateProject = () => {
    if (!newProjectName.trim()) return

    const newProject = createProject(newProjectName.trim())
    setNewProjectName('')
    setShowCreateDialog(false)
    loadProjects()

    // 새 프로젝트 페이지로 이동
    navigate(`/flow/${newProject.id}`)
  }

  const handleOpenProject = (id: string) => {
    setCurrentProjectId(id)
    navigate(`/flow/${id}`)
  }

  const handleDeleteProject = (id: string, name: string) => {
    if (confirm(`"${name}" 프로젝트를 삭제하시겠습니까?`)) {
      deleteProject(id)
      loadProjects()
    }
  }

  const handleExportProject = (project: ProjectData) => {
    exportProject(project)
  }

  const handleImportProject = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      await importProject(file)
      loadProjects()
    } catch (error) {
      alert('프로젝트 가져오기 실패: ' + (error as Error).message)
    }

    // 파일 입력 초기화
    e.target.value = ''
  }

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const handleFigmaLogin = () => {
    // OAuth가 사용 가능하면 OAuth 사용, 아니면 토큰 입력
    if (isOAuthAvailable()) {
      startFigmaOAuth()
    } else {
      handleTokenLogin()
    }
  }

  const handleTokenLogin = () => {
    const token = prompt('Figma Personal Access Token을 입력하세요:\n\n토큰 발급: Figma → Settings → Personal Access Tokens')
    if (token) {
      saveFigmaToken(token)
      setFigmaToken(token)
      alert('Figma 토큰이 저장되었습니다!')
    }
  }

  const handleFigmaLogout = () => {
    if (confirm('Figma 연결을 해제하시겠습니까?')) {
      clearFigmaToken()
      setFigmaToken(null)
    }
  }

  return (
    <div className="workspace-page">
      {/* Header */}
      <header className="workspace-header">
        <div className="header-content">
          <div className="logo-section">
            <Lightning size={32} weight="fill" className="logo-icon" />
            <h1 className="workspace-title">FigFlow</h1>
          </div>

          <div className="header-actions">
            {figmaToken ? (
              <button className="figma-status connected" onClick={handleFigmaLogout}>
                <span className="status-dot"></span>
                Figma 연결됨
              </button>
            ) : (
              <button className="figma-login-btn" onClick={handleFigmaLogin}>
                Figma 로그인
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="workspace-main">
        <div className="workspace-container">
          {/* Actions Bar */}
          <div className="actions-bar">
            <h2 className="page-title">내 프로젝트</h2>
            <div className="actions-group">
              <label className="import-btn">
                <FileArrowUp size={20} />
                가져오기
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportProject}
                  style={{ display: 'none' }}
                />
              </label>
              <button className="create-btn" onClick={() => setShowCreateDialog(true)}>
                <Plus size={20} weight="bold" />
                새 프로젝트
              </button>
            </div>
          </div>

          {/* Projects Grid */}
          {projects.length === 0 ? (
            <div className="empty-state">
              <FolderOpen size={64} weight="light" />
              <h3>프로젝트가 없습니다</h3>
              <p>새 프로젝트를 만들어 시작하세요</p>
              <button className="create-btn-large" onClick={() => setShowCreateDialog(true)}>
                <Plus size={24} weight="bold" />
                새 프로젝트 만들기
              </button>
            </div>
          ) : (
            <div className="projects-grid">
              {projects.map((project) => (
                <div key={project.id} className="project-card">
                  <div
                    className="project-card-content"
                    onClick={() => handleOpenProject(project.id)}
                  >
                    <div className="project-preview">
                      <div className="project-stats">
                        <span className="stat-badge">{project.nodes.length} 화면</span>
                        <span className="stat-badge">{project.edges.length} 연결</span>
                      </div>
                    </div>

                    <div className="project-info">
                      <h3 className="project-name">{project.name}</h3>
                      <p className="project-date">
                        업데이트: {formatDate(project.updatedAt)}
                      </p>
                    </div>
                  </div>

                  <div className="project-actions">
                    <button
                      className="action-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleExportProject(project)
                      }}
                      title="내보내기"
                    >
                      <Export size={18} />
                    </button>
                    <button
                      className="action-btn delete"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteProject(project.id, project.name)
                      }}
                      title="삭제"
                    >
                      <Trash size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Create Project Dialog */}
      {showCreateDialog && (
        <div className="dialog-overlay" onClick={() => setShowCreateDialog(false)}>
          <div className="dialog-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="dialog-title">새 프로젝트 만들기</h3>
            <input
              type="text"
              className="dialog-input"
              placeholder="프로젝트 이름"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
              autoFocus
            />
            <div className="dialog-actions">
              <button className="dialog-btn cancel" onClick={() => setShowCreateDialog(false)}>
                취소
              </button>
              <button
                className="dialog-btn confirm"
                onClick={handleCreateProject}
                disabled={!newProjectName.trim()}
              >
                만들기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default WorkspacePage

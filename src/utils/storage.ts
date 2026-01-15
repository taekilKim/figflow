import { ProjectData } from '../types'

const STORAGE_KEY = 'figflow_project'
const PROJECTS_KEY = 'figflow_projects'
const CURRENT_PROJECT_ID_KEY = 'figflow_current_project_id'

// ============================================
// 단일 프로젝트 관리 (기존 호환성 유지)
// ============================================

export function saveProject(project: ProjectData): void {
  try {
    const serialized = JSON.stringify(project)
    localStorage.setItem(STORAGE_KEY, serialized)
    console.log('Project saved successfully')
  } catch (error) {
    console.error('Failed to save project:', error)
  }
}

export function loadProject(): ProjectData | null {
  try {
    const serialized = localStorage.getItem(STORAGE_KEY)
    if (serialized === null) {
      return null
    }
    return JSON.parse(serialized)
  } catch (error) {
    console.error('Failed to load project:', error)
    return null
  }
}

export function clearProject(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
    console.log('Project cleared')
  } catch (error) {
    console.error('Failed to clear project:', error)
  }
}

// ============================================
// 다중 프로젝트 관리 (새로운 기능)
// ============================================

/**
 * 모든 프로젝트 목록 가져오기
 */
export function getAllProjects(): ProjectData[] {
  try {
    const serialized = localStorage.getItem(PROJECTS_KEY)
    if (serialized === null) {
      return []
    }
    return JSON.parse(serialized)
  } catch (error) {
    console.error('Failed to load projects:', error)
    return []
  }
}

/**
 * 특정 프로젝트 가져오기
 */
export function getProjectById(id: string): ProjectData | null {
  const projects = getAllProjects()
  return projects.find(p => p.id === id) || null
}

/**
 * 프로젝트 생성
 */
export function createProject(name: string): ProjectData {
  const newProject: ProjectData = {
    id: `project-${Date.now()}`,
    name,
    nodes: [],
    edges: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }

  const projects = getAllProjects()
  projects.push(newProject)
  saveAllProjects(projects)
  setCurrentProjectId(newProject.id)

  return newProject
}

/**
 * 프로젝트 업데이트
 */
export function updateProject(id: string, updates: Partial<ProjectData>): void {
  const projects = getAllProjects()
  const index = projects.findIndex(p => p.id === id)

  if (index === -1) {
    console.error(`Project not found: ${id}`)
    return
  }

  projects[index] = {
    ...projects[index],
    ...updates,
    id, // ID는 변경 불가
    updatedAt: Date.now(),
  }

  saveAllProjects(projects)
}

/**
 * 프로젝트 삭제
 */
export function deleteProject(id: string): void {
  const projects = getAllProjects()
  const filtered = projects.filter(p => p.id !== id)
  saveAllProjects(filtered)

  // 현재 프로젝트가 삭제된 경우 초기화
  if (getCurrentProjectId() === id) {
    clearCurrentProjectId()
  }
}

/**
 * 현재 작업 중인 프로젝트 ID 가져오기
 */
export function getCurrentProjectId(): string | null {
  return localStorage.getItem(CURRENT_PROJECT_ID_KEY)
}

/**
 * 현재 작업 중인 프로젝트 ID 설정
 */
export function setCurrentProjectId(id: string): void {
  localStorage.setItem(CURRENT_PROJECT_ID_KEY, id)
}

/**
 * 현재 작업 중인 프로젝트 ID 초기화
 */
export function clearCurrentProjectId(): void {
  localStorage.removeItem(CURRENT_PROJECT_ID_KEY)
}

/**
 * 내부 함수: 모든 프로젝트 저장
 */
function saveAllProjects(projects: ProjectData[]): void {
  try {
    const serialized = JSON.stringify(projects)
    localStorage.setItem(PROJECTS_KEY, serialized)
  } catch (error) {
    console.error('Failed to save projects:', error)
  }
}

// ============================================
// 프로젝트 가져오기/내보내기
// ============================================

export function exportProject(project: ProjectData): void {
  const dataStr = JSON.stringify(project, null, 2)
  const dataBlob = new Blob([dataStr], { type: 'application/json' })
  const url = URL.createObjectURL(dataBlob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${project.name}-${Date.now()}.json`
  link.click()
  URL.revokeObjectURL(url)
}

export function importProject(file: File): Promise<ProjectData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const project = JSON.parse(e.target?.result as string)

        // 가져온 프로젝트에 새 ID와 타임스탬프 부여
        const importedProject: ProjectData = {
          ...project,
          id: `project-${Date.now()}`,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }

        // 프로젝트 목록에 추가
        const projects = getAllProjects()
        projects.push(importedProject)
        saveAllProjects(projects)

        resolve(importedProject)
      } catch (error) {
        reject(new Error('Invalid project file'))
      }
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}


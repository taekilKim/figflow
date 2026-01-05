import { ProjectData } from '../types'

const STORAGE_KEY = 'figflow_project'

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
        resolve(project)
      } catch (error) {
        reject(new Error('Invalid project file'))
      }
    }
    reader.onerror = () => reject(new Error('Failed to read file'))
    reader.readAsText(file)
  })
}

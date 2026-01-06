import { EdgePreset } from '../types'

const PRESETS_KEY = 'figflow_edge_presets'

// 기본 프리셋
export const defaultPresets: EdgePreset[] = [
  {
    id: 'default',
    name: '기본 플로우',
    style: 'solid',
    arrowType: 'forward',
    color: '#b0b0b0',
  },
  {
    id: 'success',
    name: '성공 경로',
    style: 'solid',
    arrowType: 'forward',
    color: '#4caf50',
  },
  {
    id: 'error',
    name: '오류 경로',
    style: 'dashed',
    arrowType: 'forward',
    color: '#f44336',
  },
  {
    id: 'bidirectional',
    name: '양방향 동기화',
    style: 'solid',
    arrowType: 'both',
    color: '#2196f3',
  },
  {
    id: 'optional',
    name: '선택적 경로',
    style: 'dotted',
    arrowType: 'forward',
    color: '#9e9e9e',
  },
]

export function loadPresets(): EdgePreset[] {
  try {
    const stored = localStorage.getItem(PRESETS_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (error) {
    console.error('Failed to load presets:', error)
  }
  return defaultPresets
}

export function savePresets(presets: EdgePreset[]): void {
  try {
    localStorage.setItem(PRESETS_KEY, JSON.stringify(presets))
  } catch (error) {
    console.error('Failed to save presets:', error)
  }
}

export function addPreset(preset: EdgePreset): void {
  const presets = loadPresets()
  presets.push(preset)
  savePresets(presets)
}

export function deletePreset(id: string): void {
  const presets = loadPresets()
  const filtered = presets.filter((p) => p.id !== id)
  savePresets(filtered)
}

export function resetPresets(): void {
  savePresets(defaultPresets)
}

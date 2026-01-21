import { useEffect, useRef, useState } from 'react'

export interface UseAutoSaveOptions {
  data: unknown
  onSave: () => void
  interval?: number // 밀리초 (기본값: 10000 = 10초)
  enabled?: boolean // 자동 저장 활성화 여부
}

export interface UseAutoSaveReturn {
  lastSaved: number | null // 마지막 저장 시간 (타임스탬프)
  saveNow: () => void // 수동 저장 함수
  isSaving: boolean // 저장 중 상태
}

/**
 * 자동 저장 훅
 *
 * 주요 기능:
 * 1. 정해진 간격(기본 10초)마다 자동 저장
 * 2. 데이터 변경이 있을 때만 저장 (불필요한 저장 방지)
 * 3. 브라우저 종료 시 마지막 저장
 * 4. 저장 상태 추적
 *
 * @example
 * const { lastSaved, saveNow } = useAutoSave({
 *   data: { nodes, edges },
 *   onSave: () => saveProject(project),
 *   interval: 10000, // 10초
 * })
 */
export function useAutoSave({
  data,
  onSave,
  interval = 10000, // 기본값: 10초
  enabled = true,
}: UseAutoSaveOptions): UseAutoSaveReturn {
  const [lastSaved, setLastSaved] = useState<number | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const lastDataRef = useRef<string>('')

  // 데이터 변경 감지 (JSON 직렬화로 비교)
  const dataString = JSON.stringify(data)

  // 저장 함수
  const saveNow = () => {
    if (!enabled) return

    setIsSaving(true)
    try {
      onSave()
      lastDataRef.current = dataString
      setLastSaved(Date.now())
    } catch (error) {
      console.error('자동 저장 실패:', error)
    } finally {
      setIsSaving(false)
    }
  }

  // 정기적 자동 저장 (interval마다)
  useEffect(() => {
    if (!enabled) return

    // 초기 데이터 저장
    if (lastDataRef.current === '') {
      lastDataRef.current = dataString
    }

    // interval마다 변경사항 확인 후 저장
    const intervalId = setInterval(() => {
      const currentData = JSON.stringify(data)
      if (currentData !== lastDataRef.current) {
        saveNow()
      }
    }, interval)

    return () => clearInterval(intervalId)
  }, [data, interval, enabled])

  // 브라우저 종료 시 마지막 저장 (beforeunload)
  useEffect(() => {
    if (!enabled) return

    const handleBeforeUnload = () => {
      const currentData = JSON.stringify(data)
      if (currentData !== lastDataRef.current) {
        // 동기적으로 저장 (브라우저 종료 전)
        onSave()
        lastDataRef.current = currentData

        // 사용자에게 경고 표시 (선택적)
        // e.preventDefault()
        // e.returnValue = ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [data, enabled, onSave])

  return {
    lastSaved,
    saveNow,
    isSaving,
  }
}

/**
 * 마지막 저장 시간을 "5초 전" 형식으로 변환
 */
export function formatLastSaved(lastSaved: number | null): string {
  if (!lastSaved) return '저장 안 됨'

  const seconds = Math.floor((Date.now() - lastSaved) / 1000)

  if (seconds < 5) return '방금 저장됨'
  if (seconds < 60) return `${seconds}초 전`

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}분 전`

  const hours = Math.floor(minutes / 60)
  return `${hours}시간 전`
}

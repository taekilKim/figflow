import { useState, useEffect } from 'react'

export type DeviceType = 'mobile' | 'tablet' | 'desktop'

/**
 * 디바이스 타입 감지 훅
 * - mobile: 0-768px
 * - tablet: 769-1024px
 * - desktop: 1025px+
 */
export function useDeviceType(): DeviceType {
  const [deviceType, setDeviceType] = useState<DeviceType>('desktop')

  useEffect(() => {
    function handleResize() {
      const width = window.innerWidth

      if (width <= 768) {
        setDeviceType('mobile')
      } else if (width <= 1024) {
        setDeviceType('tablet')
      } else {
        setDeviceType('desktop')
      }
    }

    // 초기 설정
    handleResize()

    // 리사이즈 이벤트 리스너
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return deviceType
}

/**
 * 터치 디바이스 감지
 */
export function isTouchDevice(): boolean {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0
}

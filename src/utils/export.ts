import { toPng, toJpeg } from 'html-to-image'
import { jsPDF } from 'jspdf'
import { getNodesBounds, getViewportForBounds } from '@xyflow/react'
import type { Node } from '@xyflow/react'

export interface ExportOptions {
  filename?: string
  scale?: number // 이미지 품질 배수 (기본 4x)
  backgroundColor?: string
  nodes?: Node[] // 노드 목록 (바운딩 박스 계산용)
  width?: number // 뷰포트 너비
  height?: number // 뷰포트 높이
}

/**
 * Figma 이미지인지 확인
 */
function isFigmaImage(url: string): boolean {
  return url.includes('figma-alpha-api.s3') ||
         url.includes('s3-alpha-sig.figma.com') ||
         url.includes('figma.com')
}

/**
 * 이미지 URL을 fetch로 다운로드하여 base64로 변환
 * Figma 이미지는 프록시를 통해 가져옴 (CORS 우회)
 */
async function fetchImageAsBase64(url: string): Promise<string | null> {
  try {
    // Figma 이미지는 프록시를 통해 가져옴
    const fetchUrl = isFigmaImage(url)
      ? `/api/image-proxy?url=${encodeURIComponent(url)}`
      : url

    const response = await fetch(fetchUrl, { mode: 'cors' })
    if (!response.ok) return null

    const blob = await response.blob()
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch (error) {
    console.warn('Failed to fetch image via proxy:', error)
    return null
  }
}

/**
 * 외부 이미지를 base64 데이터 URL로 변환 (CORS 우회)
 */
async function convertImagesToBase64(element: HTMLElement): Promise<() => void> {
  const images = element.querySelectorAll('img')
  const originalSrcs: { img: HTMLImageElement; src: string }[] = []

  const conversions = Array.from(images).map(async (img) => {
    if (!img.src || img.src.startsWith('data:') || img.src.startsWith('blob:')) return

    try {
      const dataUrl = await fetchImageAsBase64(img.src)
      if (dataUrl) {
        originalSrcs.push({ img, src: img.src })
        img.src = dataUrl
      }
    } catch (error) {
      console.warn('Failed to convert image:', error)
    }
  })

  await Promise.all(conversions)

  return () => {
    originalSrcs.forEach(({ img, src }) => {
      img.src = src
    })
  }
}

/**
 * html-to-image 필터 함수 (UI 요소 제외)
 */
function filterElements(node: HTMLElement): boolean {
  const className = node.className?.toString?.() || ''

  // UI 요소 제외
  if (
    className.includes('react-flow__minimap') ||
    className.includes('react-flow__controls') ||
    className.includes('tds-controls') ||
    className.includes('zoom-indicator') ||
    className.includes('alignment-toolbar') ||
    className.includes('toolbar') ||
    className.includes('menu-bar') ||
    className.includes('export-menu')
  ) {
    return false
  }
  return true
}

/**
 * 노드 바운딩 박스와 뷰포트 정보로 이미지 크기 계산
 */
function getExportDimensions(
  nodes: Node[],
  viewportWidth: number,
  viewportHeight: number,
  scale: number
) {
  if (!nodes || nodes.length === 0) {
    return {
      width: viewportWidth * scale,
      height: viewportHeight * scale,
      transform: undefined
    }
  }

  // 노드 바운딩 박스 계산
  const bounds = getNodesBounds(nodes)

  // 패딩 추가
  const padding = 50
  const paddedBounds = {
    x: bounds.x - padding,
    y: bounds.y - padding,
    width: bounds.width + padding * 2,
    height: bounds.height + padding * 2,
  }

  // 바운딩 박스에 맞는 뷰포트 계산
  const viewport = getViewportForBounds(
    paddedBounds,
    paddedBounds.width,
    paddedBounds.height,
    0.5, // minZoom
    2,   // maxZoom - 최대 200%까지 (더 선명한 썸네일)
    0
  )

  return {
    width: paddedBounds.width * scale,
    height: paddedBounds.height * scale,
    transform: `translate(${viewport.x * scale}px, ${viewport.y * scale}px) scale(${viewport.zoom * scale})`
  }
}

/**
 * ReactFlow 캔버스를 PNG로 내보내기
 */
export async function exportToPNG(
  element: HTMLElement,
  options: ExportOptions = {}
): Promise<void> {
  const {
    filename = 'figflow-export',
    scale = 4,
    backgroundColor = '#ffffff',
    nodes,
    width = 1920,
    height = 1080
  } = options

  try {
    // 이미지를 base64로 변환 (CORS 우회)
    const restoreImages = await convertImagesToBase64(element)

    // 내보내기 크기 계산
    const dimensions = getExportDimensions(nodes || [], width, height, scale)

    // PNG 생성
    const dataUrl = await toPng(element, {
      backgroundColor,
      width: dimensions.width,
      height: dimensions.height,
      style: dimensions.transform ? {
        width: `${dimensions.width}px`,
        height: `${dimensions.height}px`,
        transform: dimensions.transform,
      } : undefined,
      filter: filterElements,
      pixelRatio: 1, // scale이 이미 적용됨
    })

    // 원본 이미지 복원
    restoreImages()

    // 다운로드
    const link = document.createElement('a')
    link.download = `${filename}.png`
    link.href = dataUrl
    link.click()
  } catch (error) {
    console.error('Failed to export PNG:', error)
    throw error
  }
}

/**
 * ReactFlow 캔버스를 JPG로 내보내기
 */
export async function exportToJPG(
  element: HTMLElement,
  options: ExportOptions = {}
): Promise<void> {
  const {
    filename = 'figflow-export',
    scale = 4,
    backgroundColor = '#ffffff',
    nodes,
    width = 1920,
    height = 1080
  } = options

  try {
    const restoreImages = await convertImagesToBase64(element)
    const dimensions = getExportDimensions(nodes || [], width, height, scale)

    const dataUrl = await toJpeg(element, {
      backgroundColor,
      width: dimensions.width,
      height: dimensions.height,
      style: dimensions.transform ? {
        width: `${dimensions.width}px`,
        height: `${dimensions.height}px`,
        transform: dimensions.transform,
      } : undefined,
      filter: filterElements,
      quality: 0.95,
      pixelRatio: 1,
    })

    restoreImages()

    const link = document.createElement('a')
    link.download = `${filename}.jpg`
    link.href = dataUrl
    link.click()
  } catch (error) {
    console.error('Failed to export JPG:', error)
    throw error
  }
}

/**
 * ReactFlow 캔버스를 PDF로 내보내기
 */
export async function exportToPDF(
  element: HTMLElement,
  options: ExportOptions = {}
): Promise<void> {
  const {
    filename = 'figflow-export',
    scale = 4,
    backgroundColor = '#ffffff',
    nodes,
    width = 1920,
    height = 1080
  } = options

  try {
    const restoreImages = await convertImagesToBase64(element)
    const dimensions = getExportDimensions(nodes || [], width, height, scale)

    const dataUrl = await toPng(element, {
      backgroundColor,
      width: dimensions.width,
      height: dimensions.height,
      style: dimensions.transform ? {
        width: `${dimensions.width}px`,
        height: `${dimensions.height}px`,
        transform: dimensions.transform,
      } : undefined,
      filter: filterElements,
      pixelRatio: 1,
    })

    restoreImages()

    // PDF 생성
    const pdf = new jsPDF({
      orientation: dimensions.width > dimensions.height ? 'landscape' : 'portrait',
      unit: 'px',
      format: [dimensions.width / scale, dimensions.height / scale],
    })

    pdf.addImage(dataUrl, 'PNG', 0, 0, dimensions.width / scale, dimensions.height / scale)
    pdf.save(`${filename}.pdf`)
  } catch (error) {
    console.error('Failed to export PDF:', error)
    throw error
  }
}

export type ExportFormat = 'png' | 'jpg' | 'pdf'

/**
 * 통합 내보내기 함수
 */
export async function exportCanvas(
  element: HTMLElement,
  format: ExportFormat,
  options: ExportOptions = {}
): Promise<void> {
  switch (format) {
    case 'png':
      return exportToPNG(element, options)
    case 'jpg':
      return exportToJPG(element, options)
    case 'pdf':
      return exportToPDF(element, options)
    default:
      throw new Error(`Unsupported format: ${format}`)
  }
}

import { toPng, toJpeg } from 'html-to-image'
import { jsPDF } from 'jspdf'

export interface ExportOptions {
  filename?: string
  scale?: number // 이미지 품질 배수 (기본 4x)
  backgroundColor?: string
  imageWidth?: number // 캡처할 영역 너비
  imageHeight?: number // 캡처할 영역 높이
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
 */
async function fetchImageAsBase64(url: string): Promise<string | null> {
  try {
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
 * 외부 이미지를 base64로 변환 (CORS 우회)
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
    imageWidth,
    imageHeight
  } = options

  try {
    const restoreImages = await convertImagesToBase64(element)

    const exportOptions: Parameters<typeof toPng>[1] = {
      backgroundColor,
      filter: filterElements,
      pixelRatio: scale,
    }

    // 정확한 크기가 지정된 경우 해당 크기로 캡처
    if (imageWidth && imageHeight) {
      exportOptions.width = imageWidth
      exportOptions.height = imageHeight
      exportOptions.style = {
        width: `${imageWidth}px`,
        height: `${imageHeight}px`,
      }
    }

    const dataUrl = await toPng(element, exportOptions)
    restoreImages()

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
    imageWidth,
    imageHeight
  } = options

  try {
    const restoreImages = await convertImagesToBase64(element)

    const exportOptions: Parameters<typeof toJpeg>[1] = {
      backgroundColor,
      filter: filterElements,
      quality: 0.95,
      pixelRatio: scale,
    }

    if (imageWidth && imageHeight) {
      exportOptions.width = imageWidth
      exportOptions.height = imageHeight
      exportOptions.style = {
        width: `${imageWidth}px`,
        height: `${imageHeight}px`,
      }
    }

    const dataUrl = await toJpeg(element, exportOptions)
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
    imageWidth,
    imageHeight
  } = options

  try {
    const restoreImages = await convertImagesToBase64(element)

    const exportOptions: Parameters<typeof toPng>[1] = {
      backgroundColor,
      filter: filterElements,
      pixelRatio: scale,
    }

    if (imageWidth && imageHeight) {
      exportOptions.width = imageWidth
      exportOptions.height = imageHeight
      exportOptions.style = {
        width: `${imageWidth}px`,
        height: `${imageHeight}px`,
      }
    }

    const dataUrl = await toPng(element, exportOptions)
    restoreImages()

    // 이미지 크기 계산
    const img = new Image()
    await new Promise<void>((resolve) => {
      img.onload = () => resolve()
      img.src = dataUrl
    })

    const pdf = new jsPDF({
      orientation: img.width > img.height ? 'landscape' : 'portrait',
      unit: 'px',
      format: [img.width / scale, img.height / scale],
    })

    pdf.addImage(dataUrl, 'PNG', 0, 0, img.width / scale, img.height / scale)
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

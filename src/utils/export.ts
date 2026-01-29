import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

export interface ExportOptions {
  filename?: string
  scale?: number // 이미지 품질 (기본 2x)
  backgroundColor?: string
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
      // 방법 1: fetch로 이미지 다운로드 후 base64 변환 (더 안정적)
      const dataUrl = await fetchImageAsBase64(img.src)
      if (dataUrl) {
        originalSrcs.push({ img, src: img.src })
        img.src = dataUrl
        return
      }

      // 방법 2: canvas를 통한 변환 (fallback)
      if (img.complete && img.naturalWidth > 0) {
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth
        canvas.height = img.naturalHeight
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(img, 0, 0)
          try {
            const canvasDataUrl = canvas.toDataURL('image/png')
            originalSrcs.push({ img, src: img.src })
            img.src = canvasDataUrl
          } catch {
            console.warn('Could not convert image to base64 (CORS):', img.src)
          }
        }
      }
    } catch (error) {
      console.warn('Failed to convert image:', error)
    }
  })

  await Promise.all(conversions)

  // 원본 src 복원 함수 반환
  return () => {
    originalSrcs.forEach(({ img, src }) => {
      img.src = src
    })
  }
}

/**
 * html2canvas 옵션 생성
 */
function getHtml2CanvasOptions(scale: number, backgroundColor: string) {
  return {
    scale,
    backgroundColor,
    useCORS: true,
    allowTaint: false, // taint된 캔버스는 export 불가하므로 false
    logging: false,
    // UI 요소 제외 (MiniMap, Controls, Toolbar 등)
    ignoreElements: (element: Element) => {
      const className = element.className?.toString() || ''
      // MiniMap, Controls, ZoomIndicator, Toolbar, AlignmentToolbar 제외
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
        return true
      }
      return false
    },
  }
}

/**
 * ReactFlow 캔버스를 PNG로 내보내기
 */
export async function exportToPNG(
  element: HTMLElement,
  options: ExportOptions = {}
): Promise<void> {
  const { filename = 'figflow-export', scale = 2, backgroundColor = '#ffffff' } = options

  try {
    // 이미지를 base64로 변환 (CORS 우회)
    const restoreImages = await convertImagesToBase64(element)

    const canvas = await html2canvas(element, getHtml2CanvasOptions(scale, backgroundColor))

    // 원본 이미지 복원
    restoreImages()

    // PNG 다운로드
    const link = document.createElement('a')
    link.download = `${filename}.png`
    link.href = canvas.toDataURL('image/png')
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
  const { filename = 'figflow-export', scale = 2, backgroundColor = '#ffffff' } = options

  try {
    // 이미지를 base64로 변환 (CORS 우회)
    const restoreImages = await convertImagesToBase64(element)

    const canvas = await html2canvas(element, getHtml2CanvasOptions(scale, backgroundColor))

    // 원본 이미지 복원
    restoreImages()

    // JPG 다운로드
    const link = document.createElement('a')
    link.download = `${filename}.jpg`
    link.href = canvas.toDataURL('image/jpeg', 0.95)
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
  const { filename = 'figflow-export', scale = 2, backgroundColor = '#ffffff' } = options

  try {
    // 이미지를 base64로 변환 (CORS 우회)
    const restoreImages = await convertImagesToBase64(element)

    const canvas = await html2canvas(element, getHtml2CanvasOptions(scale, backgroundColor))

    // 원본 이미지 복원
    restoreImages()

    const imgData = canvas.toDataURL('image/png')
    const imgWidth = canvas.width
    const imgHeight = canvas.height

    // PDF 크기 계산 (A4 기준으로 맞추거나 이미지 크기 그대로)
    const pdf = new jsPDF({
      orientation: imgWidth > imgHeight ? 'landscape' : 'portrait',
      unit: 'px',
      format: [imgWidth / scale, imgHeight / scale],
    })

    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth / scale, imgHeight / scale)
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

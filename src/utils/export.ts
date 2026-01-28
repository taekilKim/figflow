import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

export interface ExportOptions {
  filename?: string
  scale?: number // 이미지 품질 (기본 2x)
  backgroundColor?: string
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
    const canvas = await html2canvas(element, {
      scale,
      backgroundColor,
      useCORS: true, // 외부 이미지 허용
      allowTaint: true,
      logging: false,
    })

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
    const canvas = await html2canvas(element, {
      scale,
      backgroundColor,
      useCORS: true,
      allowTaint: true,
      logging: false,
    })

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
    const canvas = await html2canvas(element, {
      scale,
      backgroundColor,
      useCORS: true,
      allowTaint: true,
      logging: false,
    })

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

import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useReactFlow } from '@xyflow/react'
import { exportCanvas, ExportFormat } from '../utils/export'
import '../styles/MenuBar.css'

interface MenuBarProps {
  onSave?: () => void
  onSync?: () => void
  onAddFrame?: () => void
  onImportFile?: () => void
  projectName?: string
  isSyncing?: boolean
}

interface MenuItem {
  label: string
  action?: () => void
  disabled?: boolean
  shortcut?: string
  divider?: boolean
  submenu?: MenuItem[]
}

function MenuBar({ onSave, onSync, onAddFrame, onImportFile, projectName, isSyncing }: MenuBarProps) {
  const navigate = useNavigate()
  const { fitView, zoomIn, zoomOut, setViewport, getViewport, getNodes, zoomTo } = useReactFlow()
  const [activeMenu, setActiveMenu] = useState<string | null>(null)
  const menuBarRef = useRef<HTMLDivElement>(null)

  // 메뉴 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuBarRef.current && !menuBarRef.current.contains(e.target as Node)) {
        setActiveMenu(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleExport = async (format: ExportFormat) => {
    setActiveMenu(null)
    const flowContainer = document.querySelector('.react-flow') as HTMLElement
    if (!flowContainer) return

    try {
      // 1. 현재 뷰포트 상태 저장
      const currentViewport = getViewport()

      // 2. 모든 노드가 보이도록 fitView 호출
      fitView({ padding: 0.1, duration: 0 })

      // 3. fitView 완료 및 이미지 렌더링 대기
      await new Promise(resolve => setTimeout(resolve, 500))

      // 4. 캡처
      await exportCanvas(flowContainer, format, { filename: projectName || 'figflow-export', scale: 2 })

      // 5. 원래 뷰포트로 복원
      setViewport(currentViewport, { duration: 0 })
    } catch (error) {
      console.error('Export failed:', error)
    }
  }

  // Cmd+0: 100%로 줌
  const handleZoomReset = () => {
    zoomTo(1, { duration: 800 })
    setActiveMenu(null)
  }

  // Cmd+2: 선택 프레임에 맞추기
  const handleFitSelection = () => {
    const selectedNodes = getNodes().filter((n) => n.selected)
    if (selectedNodes.length > 0) {
      fitView({ nodes: selectedNodes, padding: 0.2, duration: 800 })
    }
    setActiveMenu(null)
  }

  const menus: Record<string, MenuItem[]> = {
    파일: [
      { label: '대시보드로 돌아가기', action: () => navigate('/workspace') },
      { label: '', divider: true },
      { label: '새 프로젝트', disabled: true },
      { label: '피그마 파일 불러오기', action: onImportFile },
      { label: '피그마 프레임 불러오기', action: onAddFrame },
      { label: '동기화', action: onSync, disabled: isSyncing },
      { label: '', divider: true },
      { label: '저장하기', action: onSave, shortcut: '⌘S' },
      {
        label: '내보내기',
        submenu: [
          { label: 'PDF로 내보내기', action: () => handleExport('pdf') },
          { label: 'JPG로 내보내기', action: () => handleExport('jpg') },
          { label: 'PNG로 내보내기', action: () => handleExport('png') },
        ],
      },
    ],
    편집: [
      { label: '실행취소', shortcut: '⌘Z', disabled: true },
      { label: '재실행', shortcut: '⇧⌘Z', disabled: true },
      { label: '', divider: true },
      { label: '복사', shortcut: '⌘C', disabled: true },
      { label: '붙여넣기', shortcut: '⌘V', disabled: true },
      { label: '잘라내기', shortcut: '⌘X', disabled: true },
    ],
    보기: [
      { label: '100% 비율로 줌', action: handleZoomReset, shortcut: '⌘0' },
      { label: '전체 보기', action: () => { fitView({ padding: 0.1, duration: 800 }); setActiveMenu(null) }, shortcut: '⌘1' },
      { label: '선택 프레임에 맞추기', action: handleFitSelection, shortcut: '⌘2' },
      { label: '', divider: true },
      { label: '줌인', action: () => { zoomIn(); setActiveMenu(null) }, shortcut: '⌘+' },
      { label: '줌아웃', action: () => { zoomOut(); setActiveMenu(null) }, shortcut: '⌘-' },
    ],
    윈도우: [
      { label: '작업내역 보기', disabled: true },
    ],
    도움말: [
      { label: '현재 버전: v0.1.1', disabled: true },
      { label: '업데이트 노트', disabled: true },
      { label: '', divider: true },
      { label: '버그 제보 및 문의, 제안', action: () => { window.open('https://github.com/taekilKim/figflow/issues', '_blank'); setActiveMenu(null) } },
    ],
  }

  const renderMenuItem = (item: MenuItem, index: number) => {
    if (item.divider) {
      return <div key={index} className="menu-divider" />
    }

    if (item.submenu) {
      return (
        <div key={index} className="menu-dropdown-item has-submenu">
          <span>{item.label}</span>
          <span className="submenu-arrow">▶</span>
          <div className="submenu">
            {item.submenu.map((subItem, subIndex) => renderMenuItem(subItem, subIndex))}
          </div>
        </div>
      )
    }

    return (
      <button
        key={index}
        className={`menu-dropdown-item ${item.disabled ? 'disabled' : ''}`}
        onClick={() => {
          if (!item.disabled && item.action) {
            item.action()
            setActiveMenu(null)
          }
        }}
        disabled={item.disabled}
      >
        <span>{item.label}</span>
        {item.shortcut && <span className="shortcut">{item.shortcut}</span>}
      </button>
    )
  }

  return (
    <div className="menu-bar" ref={menuBarRef}>
      <div className="menu-bar-inner">
        <div className="menu-items">
          {Object.entries(menus).map(([menuName, items]) => (
            <div key={menuName} className="menu-wrapper">
              <button
                className={`menu-item ${activeMenu === menuName ? 'active' : ''}`}
                onClick={() => setActiveMenu(activeMenu === menuName ? null : menuName)}
                onMouseEnter={() => activeMenu && setActiveMenu(menuName)}
              >
                {menuName}
              </button>
              {activeMenu === menuName && (
                <div className="menu-dropdown">
                  {items.map((item, index) => renderMenuItem(item, index))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default MenuBar

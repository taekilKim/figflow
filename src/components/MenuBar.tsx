import { useNavigate } from 'react-router-dom'
import '../styles/MenuBar.css'

function MenuBar() {
  const navigate = useNavigate()

  const handleReturnToWorkspace = () => {
    navigate('/workspace')
  }

  return (
    <div className="menu-bar">
      <div className="menu-bar-inner">
        <div className="menu-items">
          <button className="menu-item" disabled>
            파일
          </button>
          <button className="menu-item" disabled>
            편집
          </button>
          <button className="menu-item" onClick={handleReturnToWorkspace}>
            보기
          </button>
          <button className="menu-item" disabled>
            창
          </button>
          <button className="menu-item" disabled>
            도움말
          </button>
        </div>
      </div>
    </div>
  )
}

export default MenuBar

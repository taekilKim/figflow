import { useState } from 'react'
import FlowCanvas from './components/FlowCanvas'
import LeftPanel from './components/LeftPanel'
import RightPanel from './components/RightPanel'
import './styles/App.css'

function App() {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)

  return (
    <div className="app-container">
      <LeftPanel />
      <FlowCanvas
        onNodeSelect={setSelectedNodeId}
        onEdgeSelect={setSelectedEdgeId}
      />
      <RightPanel
        selectedNodeId={selectedNodeId}
        selectedEdgeId={selectedEdgeId}
      />
    </div>
  )
}

export default App

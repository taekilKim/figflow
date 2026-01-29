import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { initSentry } from './utils/sentry'
import './styles/global.css'

// Sentry 에러 추적 초기화 (프로덕션 환경에서만)
initSentry()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import * as Sentry from '@sentry/react'
import LandingPage from './pages/LandingPage'
import WorkspacePage from './pages/WorkspacePage'
import FlowPage from './pages/FlowPage'
import AuthCallbackPage from './pages/AuthCallbackPage'
import AdminPage from './pages/AdminPage'
import PrivacyPage from './pages/PrivacyPage'
import ProtectedRoute from './components/ProtectedRoute'
import { ToastProvider } from './components/Toast'
import { DialogProvider } from './components/Dialog'
import './styles/App.css'

// 에러 발생 시 표시할 폴백 UI
function ErrorFallback() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      textAlign: 'center',
      background: '#f8fafc'
    }}>
      <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '12px', color: '#1e293b' }}>
        오류가 발생했습니다
      </h1>
      <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px' }}>
        문제가 자동으로 보고되었습니다. 잠시 후 다시 시도해주세요.
      </p>
      <button
        onClick={() => window.location.reload()}
        style={{
          padding: '12px 24px',
          background: '#3182f6',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: 600,
          cursor: 'pointer'
        }}
      >
        새로고침
      </button>
    </div>
  )
}

function App() {
  return (
    <Sentry.ErrorBoundary fallback={<ErrorFallback />}>
      <ToastProvider>
        <DialogProvider>
          <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route
              path="/workspace"
              element={
                <ProtectedRoute>
                  <WorkspacePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/flow/:id"
              element={
                <ProtectedRoute>
                  <FlowPage />
                </ProtectedRoute>
              }
            />
            <Route path="/auth/callback" element={<AuthCallbackPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </DialogProvider>
    </ToastProvider>
    </Sentry.ErrorBoundary>
  )
}

export default App

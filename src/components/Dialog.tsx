import { createContext, useContext, useState, useCallback, ReactNode, useRef, useEffect } from 'react'
import '../styles/Dialog.css'

type DialogType = 'confirm' | 'prompt' | 'alert'

interface DialogOptions {
  title?: string
  message: string
  type: DialogType
  confirmText?: string
  cancelText?: string
  placeholder?: string
  defaultValue?: string
}

interface DialogContextType {
  confirm: (message: string, title?: string) => Promise<boolean>
  prompt: (message: string, defaultValue?: string, title?: string) => Promise<string | null>
  alert: (message: string, title?: string) => Promise<void>
}

const DialogContext = createContext<DialogContextType | null>(null)

export function useDialog() {
  const context = useContext(DialogContext)
  if (!context) {
    throw new Error('useDialog must be used within DialogProvider')
  }
  return context
}

export function DialogProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<DialogOptions | null>(null)
  const [inputValue, setInputValue] = useState('')
  const resolveRef = useRef<((value: any) => void) | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (dialog?.type === 'prompt' && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [dialog])

  const showDialog = useCallback((options: DialogOptions): Promise<any> => {
    return new Promise((resolve) => {
      resolveRef.current = resolve
      setInputValue(options.defaultValue || '')
      setDialog(options)
    })
  }, [])

  const confirm = useCallback((message: string, title?: string): Promise<boolean> => {
    return showDialog({
      type: 'confirm',
      message,
      title: title || '확인',
      confirmText: '확인',
      cancelText: '취소',
    })
  }, [showDialog])

  const prompt = useCallback((message: string, defaultValue?: string, title?: string): Promise<string | null> => {
    return showDialog({
      type: 'prompt',
      message,
      title: title || '입력',
      confirmText: '확인',
      cancelText: '취소',
      defaultValue: defaultValue || '',
    })
  }, [showDialog])

  const alert = useCallback((message: string, title?: string): Promise<void> => {
    return showDialog({
      type: 'alert',
      message,
      title: title || '알림',
      confirmText: '확인',
    })
  }, [showDialog])

  const handleConfirm = () => {
    if (dialog?.type === 'prompt') {
      resolveRef.current?.(inputValue)
    } else if (dialog?.type === 'confirm') {
      resolveRef.current?.(true)
    } else {
      resolveRef.current?.(undefined)
    }
    setDialog(null)
  }

  const handleCancel = () => {
    if (dialog?.type === 'prompt') {
      resolveRef.current?.(null)
    } else {
      resolveRef.current?.(false)
    }
    setDialog(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleConfirm()
    } else if (e.key === 'Escape') {
      handleCancel()
    }
  }

  return (
    <DialogContext.Provider value={{ confirm, prompt, alert }}>
      {children}
      {dialog && (
        <div className="dialog-overlay" onClick={handleCancel}>
          <div className="dialog" onClick={e => e.stopPropagation()} onKeyDown={handleKeyDown}>
            <div className="dialog-header">
              <h3>{dialog.title}</h3>
            </div>
            <div className="dialog-body">
              <p style={{ whiteSpace: 'pre-wrap' }}>{dialog.message}</p>
              {dialog.type === 'prompt' && (
                <input
                  ref={inputRef}
                  type="text"
                  className="dialog-input"
                  value={inputValue}
                  onChange={e => setInputValue(e.target.value)}
                  placeholder={dialog.placeholder}
                />
              )}
            </div>
            <div className="dialog-footer">
              {dialog.type !== 'alert' && (
                <button className="dialog-btn dialog-btn-cancel" onClick={handleCancel}>
                  {dialog.cancelText}
                </button>
              )}
              <button className="dialog-btn dialog-btn-confirm" onClick={handleConfirm}>
                {dialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  )
}

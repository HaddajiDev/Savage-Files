import { useCallback, useRef, useState } from "react"
import Icon from "./Icon"

export function useToasts() {
  const [toasts, setToasts] = useState([])
  const timers = useRef({})

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current[id])
    delete timers.current[id]
    setToasts((list) => list.filter((t) => t.id !== id))
  }, [])

  const push = useCallback((message, options = {}) => {
    const id = Date.now() + Math.random()
    const toast = { id, message, tone: options.tone || "neutral", action: options.action }
    setToasts((list) => [...list.slice(-2), toast])
    timers.current[id] = setTimeout(() => dismiss(id), options.action ? 6000 : 3200)
    return id
  }, [dismiss])

  return { toasts, push, dismiss }
}

function Toasts({ toasts, dismiss }) {
  return (
    <div className="pf-toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`pf-toast is-${t.tone}`}>
          <Icon name={t.tone === "error" ? "alert" : "check"} size={15} className="pf-toast-icon" />
          <span className="pf-toast-msg">{t.message}</span>
          {t.action && (
            <button
              className="pf-toast-action"
              onClick={() => {
                t.action.onClick()
                dismiss(t.id)
              }}
            >
              {t.action.label}
            </button>
          )}
          <button className="pf-toast-close" onClick={() => dismiss(t.id)} aria-label="Dismiss">
            <Icon name="close" size={13} />
          </button>
        </div>
      ))}
    </div>
  )
}

export default Toasts

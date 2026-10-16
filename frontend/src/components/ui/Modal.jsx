import { useEffect } from "react"
import { createPortal } from "react-dom"
import { cn } from "../../lib/utils"

const sizeStyles = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
  full: "max-w-[95vw] h-[90vh]",
}

export function Modal({
  isOpen,
  onClose,
  children,
  size = "md",
  closeOnOverlayClick = true,
  showCloseButton = true,
  className,
}) {
  // Fecha ao pressionar ESC
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose?.()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    // Bloqueia scroll do body
    document.body.style.overflow = "hidden"

    return () => {
      document.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = "unset"
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget && closeOnOverlayClick) {
      onClose?.()
    }
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-navy/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        className={cn(
          "relative w-full bg-white rounded-3xl shadow-2xl border border-brand-border/60 overflow-hidden",
          "flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200",
          sizeStyles[size] || sizeStyles.md,
          className
        )}
      >
        {showCloseButton && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar modal"
            className="absolute top-5 right-5 p-2 rounded-xl text-brand-muted hover:text-brand-navy hover:bg-slate-100 transition-colors z-10"
          >
            <svg
              className="w-5 h-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}

        {children}
      </div>
    </div>,
    document.body
  )
}

export function ModalHeader({ children, className, ...props }) {
  return (
    <div className={cn("px-6 pt-6 pb-3 border-b border-slate-100", className)} {...props}>
      {children}
    </div>
  )
}

export function ModalTitle({ children, className, ...props }) {
  return (
    <h3
      className={cn("text-xl font-bold text-brand-navy tracking-tight", className)}
      {...props}
    >
      {children}
    </h3>
  )
}

export function ModalDescription({ children, className, ...props }) {
  return (
    <p className={cn("text-xs text-brand-muted mt-1", className)} {...props}>
      {children}
    </p>
  )
}

export function ModalBody({ children, className, ...props }) {
  return (
    <div className={cn("p-6 overflow-y-auto flex-1", className)} {...props}>
      {children}
    </div>
  )
}

export function ModalFooter({ children, className, ...props }) {
  return (
    <div
      className={cn(
        "px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export default Modal

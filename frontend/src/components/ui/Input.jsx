import { forwardRef } from "react"
import { cn } from "../../lib/utils"

export const Input = forwardRef(function Input(
  {
    label,
    error,
    helperText,
    leftIcon,
    rightIcon,
    isSearch = false,
    onClear,
    className,
    containerClassName,
    id,
    disabled,
    value,
    ...props
  },
  ref
) {
  const inputId = id || (label ? `input-${label.toLowerCase().replace(/\s+/g, "-")}` : undefined)

  return (
    <div className={cn("w-full flex flex-col gap-1.5", containerClassName)}>
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-semibold text-brand-navy tracking-wide uppercase select-none"
        >
          {label}
        </label>
      )}

      <div className="relative flex items-center">
        {leftIcon && (
          <div className="absolute left-3.5 flex items-center pointer-events-none text-brand-muted">
            {leftIcon}
          </div>
        )}

        {isSearch && !leftIcon && (
          <div className="absolute left-3.5 flex items-center pointer-events-none text-brand-muted">
            <svg
              className="w-4 h-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
        )}

        <input
          ref={ref}
          id={inputId}
          disabled={disabled}
          value={value}
          className={cn(
            "w-full h-11 px-4 text-sm text-brand-navy bg-white border rounded-xl transition-all duration-150",
            "placeholder:text-brand-muted-light",
            "focus:outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20",
            leftIcon || isSearch ? "pl-10" : "",
            rightIcon || (onClear && value) ? "pr-10" : "",
            error
              ? "border-brand-error focus:border-brand-error focus:ring-brand-error/20"
              : "border-brand-border hover:border-brand-border-hover",
            disabled && "bg-slate-50 text-slate-400 cursor-not-allowed opacity-75",
            className
          )}
          {...props}
        />

        {onClear && value && !rightIcon && (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-3 p-1 rounded-full text-brand-muted hover:text-brand-navy hover:bg-slate-100 transition-colors"
            title="Limpar campo"
          >
            <svg
              className="w-4 h-4"
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

        {rightIcon && (
          <div className="absolute right-3.5 flex items-center text-brand-muted">
            {rightIcon}
          </div>
        )}
      </div>

      {error ? (
        <p className="text-xs text-brand-error font-medium flex items-center gap-1 mt-0.5">
          <svg
            className="w-3.5 h-3.5 shrink-0"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <span>{error}</span>
        </p>
      ) : helperText ? (
        <p className="text-xs text-brand-muted">{helperText}</p>
      ) : null}
    </div>
  )
})

export default Input

import { cn } from "../../lib/utils"

const variantStyles = {
  primary:
    "bg-brand-green hover:bg-brand-green-hover text-white shadow-sm hover:shadow-md hover:shadow-brand-green/25 active:scale-[0.98]",
  secondary:
    "bg-brand-navy hover:bg-brand-navy-light text-white shadow-sm active:scale-[0.98]",
  teal:
    "bg-brand-teal hover:bg-brand-teal/90 text-white shadow-sm active:scale-[0.98]",
  outline:
    "border border-brand-border bg-white text-brand-navy hover:bg-brand-green-light hover:text-brand-green hover:border-brand-green/40 active:scale-[0.98]",
  ghost:
    "bg-transparent text-brand-navy hover:bg-brand-green-light hover:text-brand-green active:scale-[0.98]",
  danger:
    "bg-brand-error hover:bg-brand-error/90 text-white shadow-sm active:scale-[0.98]",
  subtle:
    "bg-brand-green-light text-brand-green hover:bg-brand-green/20 active:scale-[0.98]",
}

const sizeStyles = {
  sm: "h-8 px-3 text-xs rounded-lg gap-1.5",
  md: "h-10 px-4 py-2 text-sm rounded-xl gap-2",
  lg: "h-12 px-6 text-base rounded-2xl gap-2.5 font-semibold",
  icon: "h-10 w-10 p-0 rounded-xl justify-center",
  "icon-sm": "h-8 w-8 p-0 rounded-lg justify-center",
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  isLoading = false,
  leftIcon,
  rightIcon,
  className,
  disabled,
  type = "button",
  ...props
}) {
  const isDisabled = disabled || isLoading

  return (
    <button
      type={type}
      disabled={isDisabled}
      className={cn(
        "inline-flex items-center justify-center font-medium transition-all duration-150 select-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/50 focus-visible:ring-offset-2",
        "disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed",
        variantStyles[variant] || variantStyles.primary,
        sizeStyles[size] || sizeStyles.md,
        className
      )}
      {...props}
    >
      {isLoading ? (
        <>
          <svg
            className="animate-spin -ml-0.5 mr-2 h-4 w-4 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span>Carregando...</span>
        </>
      ) : (
        <>
          {leftIcon && <span className="shrink-0">{leftIcon}</span>}
          {children}
          {rightIcon && <span className="shrink-0">{rightIcon}</span>}
        </>
      )}
    </button>
  )
}

export default Button

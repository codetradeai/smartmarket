import { cn } from "../../lib/utils"

export function Card({
  children,
  variant = "default",
  className,
  ...props
}) {
  const variantStyles = {
    default: "bg-white border border-brand-border rounded-2xl shadow-sm",
    elevated: "bg-white border border-brand-border/60 rounded-2xl shadow-[0_8px_32px_rgba(13,33,55,0.08)]",
    interactive:
      "bg-white border border-brand-border rounded-2xl shadow-sm hover:shadow-md hover:border-brand-green/40 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer",
    subtle: "bg-brand-green-light/30 border border-brand-border/60 rounded-2xl",
    flat: "bg-white rounded-2xl",
  }

  return (
    <div
      className={cn(
        "overflow-hidden transition-colors",
        variantStyles[variant] || variantStyles.default,
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ children, className, ...props }) {
  return (
    <div className={cn("p-6 pb-3 flex flex-col gap-1.5", className)} {...props}>
      {children}
    </div>
  )
}

export function CardTitle({ children, className, as: Component = "h3", ...props }) {
  return (
    <Component
      className={cn("text-lg font-bold text-brand-navy tracking-tight", className)}
      {...props}
    >
      {children}
    </Component>
  )
}

export function CardDescription({ children, className, ...props }) {
  return (
    <p className={cn("text-xs text-brand-muted leading-relaxed", className)} {...props}>
      {children}
    </p>
  )
}

export function CardContent({ children, className, ...props }) {
  return (
    <div className={cn("p-6 pt-3", className)} {...props}>
      {children}
    </div>
  )
}

export function CardFooter({ children, className, ...props }) {
  return (
    <div
      className={cn(
        "p-6 pt-0 flex items-center justify-between gap-3 border-t border-slate-100 mt-2",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export default Card

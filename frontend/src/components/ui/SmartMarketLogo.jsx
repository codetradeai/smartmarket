import { cn } from "../../lib/utils"
import logo from "../../assets/logo.png"

const heights = {
  sm: "h-11",
  md: "h-14",
  lg: "h-16 sm:h-[66px]",
}

export function SmartMarketLogo({
  size = "md",
  className = "",
}) {
  return (
    <img
      src={logo}
      alt="SmartMarket"
      className={cn("w-auto max-w-full object-contain", heights[size] || heights.md, className)}
    />
  )
}

export default SmartMarketLogo

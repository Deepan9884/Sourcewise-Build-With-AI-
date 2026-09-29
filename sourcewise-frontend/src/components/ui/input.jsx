import * as React from "react"
import { cn } from "../../lib/utils"

const Input = React.forwardRef(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "flex h-11 w-full rounded-xl border-2 border-wood-light/30 bg-parchment/50 px-4 py-2.5 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-wood/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-warm/30 focus-visible:border-amber-warm transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-50 shadow-warm-sm hover:border-amber-warm/30 hover:shadow-warm",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Input.displayName = "Input"

export { Input }

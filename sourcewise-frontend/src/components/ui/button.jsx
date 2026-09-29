import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority"
import { cn } from "../../lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-semibold ring-offset-background transition-all duration-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
      variants: {
        variant: {
          default: "sw-btn-primary",
          destructive:
            "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl h-11 px-5 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 transition-all duration-200 shadow-warm active:scale-[0.98]",
          outline:
            "sw-btn-secondary",
          secondary:
            "sw-btn-secondary",
        ghost: "hover:bg-parchment hover:text-wood-dark",
        link: "text-amber-warm underline-offset-4 hover:underline",
        success: "bg-gradient-to-r from-sage to-moss text-white shadow-warm hover:shadow-warm-md hover:scale-[1.02]",
        wood: "bg-gradient-to-b from-wood-dark to-wood text-parchment-light shadow-warm hover:shadow-warm-md hover:scale-[1.02]",
        parchment: "bg-parchment border border-wood-light/20 text-wood-dark shadow-paper hover:shadow-paper-hover hover:scale-[1.02]",
        warm: "bg-gradient-to-r from-amber-warm/20 to-amber-gold/20 text-wood-dark border border-amber-warm/30 hover:shadow-candle hover:scale-[1.02]",
      },
      size: {
        default: "h-11 px-5 py-2.5",
        sm: "h-9 rounded-lg px-3 text-xs",
        lg: "h-12 rounded-xl px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button"
  return (
    <Comp
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      {...props}
    />
  )
})
Button.displayName = "Button"

export { Button, buttonVariants }

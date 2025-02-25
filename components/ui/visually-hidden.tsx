import * as React from "react"

const VisuallyHidden = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(
  ({ children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        {...props}
        className="absolute w-[1px] h-[1px] p-0 -m-[1px] overflow-hidden clip-[rect(0,0,0,0)] whitespace-nowrap border-0"
      >
        {children}
      </span>
    )
  },
)
VisuallyHidden.displayName = "VisuallyHidden"

export { VisuallyHidden }


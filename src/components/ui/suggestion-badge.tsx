import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const suggestionBadgeVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-full text-xs font-medium transition-all duration-200 cursor-pointer border hover:shadow-sm",
  {
    variants: {
      variant: {
        default: "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100 hover:border-gray-300",
        primary: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 hover:border-blue-300",
      },
      size: {
        sm: "h-7 px-2.5 py-1",
        default: "h-8 px-3 py-1.5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface SuggestionBadgeProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof suggestionBadgeVariants> {
  question: string
  onQuestionClick?: (question: string, index?: number) => void
}

const SuggestionBadge = React.forwardRef<HTMLButtonElement, SuggestionBadgeProps>(
  ({ className, variant, size, question, onQuestionClick, ...props }, ref) => {
    const handleClick = () => {
      onQuestionClick?.(question)
    }

    return (
      <button
        className={cn(suggestionBadgeVariants({ variant, size, className }))}
        ref={ref}
        onClick={handleClick}
        {...props}
      >
        {question}
      </button>
    )
  }
)
SuggestionBadge.displayName = "SuggestionBadge"

export { SuggestionBadge, suggestionBadgeVariants }
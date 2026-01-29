/**
 * Breadcrumbs Component
 * 
 * Navigation breadcrumbs for detail pages and nested routes.
 * Provides clear navigation hierarchy and allows users to navigate back.
 */

import * as React from "react"
import { useNavigate } from "react-router-dom"
import { ChevronRight, Home } from "lucide-react"
import { cn } from "@/lib/utils"

export interface BreadcrumbItem {
  label: string
  href?: string
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[]
  className?: string
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ items, className }) => {
  const navigate = useNavigate()

  if (items.length === 0) {
    return null
  }

  const handleClick = (href?: string, e?: React.MouseEvent) => {
    if (href) {
      e?.preventDefault()
      navigate(href)
    }
  }

  return (
    <nav
      aria-label="Breadcrumb navigation"
      className={cn("flex items-center space-x-2 text-sm text-text-secondary", className)}
    >
      <ol className="flex items-center space-x-2" role="list">
        {items.map((item, index) => {
          const isLast = index === items.length - 1
          const isClickable = item.href && !isLast

          return (
            <li key={index} className="flex items-center">
              {index > 0 && (
                <ChevronRight
                  className="h-4 w-4 mx-2 text-neutral-400"
                  aria-hidden="true"
                />
              )}
              {isClickable ? (
                <button
                  onClick={(e) => handleClick(item.href, e)}
                  className="hover:text-text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded"
                  aria-current={isLast ? "page" : undefined}
                >
                  {index === 0 && items.length > 1 ? (
                    <span className="flex items-center gap-1">
                      <Home className="h-4 w-4" aria-hidden="true" />
                      <span className="sr-only">Home</span>
                    </span>
                  ) : (
                    item.label
                  )}
                </button>
              ) : (
                <span
                  className={cn(
                    isLast && "text-text-primary font-medium",
                    index === 0 && items.length > 1 && "flex items-center gap-1"
                  )}
                  aria-current={isLast ? "page" : undefined}
                >
                  {index === 0 && items.length > 1 ? (
                    <>
                      <Home className="h-4 w-4" aria-hidden="true" />
                      <span className="sr-only">Home</span>
                    </>
                  ) : (
                    item.label
                  )}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}


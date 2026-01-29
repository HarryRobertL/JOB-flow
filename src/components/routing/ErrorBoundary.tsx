/**
 * ErrorBoundary
 *
 * Catches uncaught errors in the component tree and renders the 500 page.
 */

import * as React from "react"
import { ServerErrorPage } from "@/pages/ServerErrorPage"

export interface ErrorBoundaryProps {
  children: React.ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(_error: Error, _errorInfo: React.ErrorInfo): void {
    // Error state is already set; 500 page will be shown.
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return <ServerErrorPage />
    }
    return this.props.children
  }
}

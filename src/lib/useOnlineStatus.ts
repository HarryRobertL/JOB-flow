/**
 * useOnlineStatus Hook
 * 
 * React hook for detecting online/offline status.
 * Listens to window online/offline events and exposes current status.
 */

import * as React from "react"

/**
 * Hook to detect online/offline status
 * @returns boolean indicating if the user is currently online
 */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = React.useState(() => {
    // Initialize with current navigator.onLine status
    if (typeof navigator !== "undefined") {
      return navigator.onLine
    }
    return true // Default to online if navigator is not available
  })

  React.useEffect(() => {
    // Update state when online/offline events fire
    const handleOnline = () => {
      setIsOnline(true)
    }

    const handleOffline = () => {
      setIsOnline(false)
    }

    // Add event listeners
    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    // Cleanup
    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  return isOnline
}

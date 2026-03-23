import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ClaimantDashboardContainer } from '../ClaimantDashboardContainer'
import * as apiClient from '@/lib/apiClient'
import * as analytics from '@/lib/analytics'

class MockEventSource {
  onmessage: ((ev: MessageEvent) => void) | null = null
  onerror: ((ev: Event) => void) | null = null
  close = vi.fn()
}

// Mock dependencies
vi.mock('@/lib/apiClient', () => ({
  apiGet: vi.fn(),
  startAutomationRun: vi.fn(),
}))

vi.mock('@/lib/analytics', () => ({
  trackEvent: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/useAnalytics', () => ({
  useAnalytics: () => ({
    track: vi.fn().mockResolvedValue(undefined),
    trackPageView: true,
    pageIdentifier: 'claimant',
  }),
}))

vi.mock('@/contexts/ToastContext', () => ({
  useToast: () => ({
    showToast: vi.fn(),
  }),
}))

vi.mock('../ClaimantDashboard', () => ({
  ClaimantDashboard: () => <div data-testid="claimant-dashboard">Dashboard</div>,
}))

const mockApiResponse = {
  stats: {
    applied: 0,
    skip: 0,
    error: 0,
    last_run: null,
  },
  activity: [],
  compliance: {
    week_start: new Date().toISOString(),
    week_end: new Date().toISOString(),
    applications_this_week: 0,
    required_applications: 10,
    is_compliant: false,
  },
}

describe('ClaimantDashboardContainer - Welcome Banner', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    vi.mocked(apiClient.apiGet).mockResolvedValue(mockApiResponse)
    vi.mocked(apiClient.startAutomationRun).mockResolvedValue({} as any)
    vi.mocked(analytics.trackEvent).mockResolvedValue(undefined)
    vi.spyOn(window, 'setInterval').mockReturnValue(1 as any)
    vi.spyOn(window, 'clearInterval').mockImplementation(() => {})
    vi.stubGlobal('EventSource', MockEventSource as any)
    window.history.pushState({}, '', '/app/dashboard')
  })

  afterEach(() => {
    cleanup()
    localStorage.clear()
    vi.clearAllMocks()
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    window.history.pushState({}, '', '/app/dashboard')
  })

  it('shows welcome banner when localStorage flag is set', async () => {
    localStorage.setItem('autoapplyer.justCompletedOnboarding', 'true')

    render(
      <MemoryRouter initialEntries={['/app/dashboard']}>
        <ClaimantDashboardContainer />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Welcome to your job search dashboard')).toBeInTheDocument()
    }, { timeout: 2000 })

    expect(analytics.trackEvent).toHaveBeenCalledWith({ event: 'welcome_banner_shown' })
  })

  it('clears localStorage flag after showing banner', async () => {
    localStorage.setItem('autoapplyer.justCompletedOnboarding', 'true')

    render(
      <MemoryRouter initialEntries={['/app/dashboard']}>
        <ClaimantDashboardContainer />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Welcome to your job search dashboard')).toBeInTheDocument()
    }, { timeout: 2000 })

    expect(localStorage.getItem('autoapplyer.justCompletedOnboarding')).toBeNull()
  })

  it('does not show banner when no flags are set', () => {
    render(
      <MemoryRouter initialEntries={['/app/dashboard']}>
        <ClaimantDashboardContainer />
      </MemoryRouter>
    )

    // Banner should not be present immediately
    expect(screen.queryByText('Welcome to your job search dashboard')).not.toBeInTheDocument()
    expect(analytics.trackEvent).not.toHaveBeenCalledWith({ event: 'welcome_banner_shown' })
  })

  it('shows banner with "Run my first discovery" button', async () => {
    localStorage.setItem('autoapplyer.justCompletedOnboarding', 'true')

    render(
      <MemoryRouter initialEntries={['/app/dashboard']}>
        <ClaimantDashboardContainer />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Run my first discovery')).toBeInTheDocument()
    }, { timeout: 2000 })
  })

  it('shows banner with settings message', async () => {
    localStorage.setItem('autoapplyer.justCompletedOnboarding', 'true')

    render(
      <MemoryRouter initialEntries={['/app/dashboard']}>
        <ClaimantDashboardContainer />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/You can change your settings any time under Settings/i)).toBeInTheDocument()
    }, { timeout: 2000 })
  })

  it('tracks welcome_run_clicked when button is clicked', async () => {
    localStorage.setItem('autoapplyer.justCompletedOnboarding', 'true')
    // Make startAutomationRun never resolve so handleStartRun stops at the
    // await and never triggers the fetchData/isRunInProgress re-render loop.
    vi.mocked(apiClient.startAutomationRun).mockReturnValue(new Promise<any>(() => {}))

    const { unmount } = render(
      <MemoryRouter initialEntries={['/app/dashboard']}>
        <ClaimantDashboardContainer />
      </MemoryRouter>
    )

    const button = await screen.findByText('Run my first discovery', {}, { timeout: 2000 })
    
    // trackEvent is invoked synchronously inside handleWelcomeRunClick
    // (before the await startAutomationRun), so it registers immediately.
    fireEvent.click(button)
    
    expect(analytics.trackEvent).toHaveBeenCalledWith({ event: 'welcome_run_clicked' })
    expect(apiClient.startAutomationRun).toHaveBeenCalledWith(true)
    
    // Unmount before the pending promise can trigger state updates
    unmount()
  })
})

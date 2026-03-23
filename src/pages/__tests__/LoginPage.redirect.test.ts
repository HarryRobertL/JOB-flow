import { describe, it, expect } from 'vitest'
import { getRedirectPathForUser } from '../LoginPage'
import type { User } from '@/contexts/AuthContext'

describe('LoginPage - getRedirectPathForUser', () => {
  it('redirects claimant with incomplete profile to /app/onboarding', () => {
    const user: User = {
      id: '1',
      email: 'claimant@example.com',
      role: 'claimant',
      hasCompletedOnboarding: false,
    }
    expect(getRedirectPathForUser(user)).toBe('/app/onboarding')
  })

  it('redirects claimant with completed profile to /app/dashboard', () => {
    const user: User = {
      id: '1',
      email: 'claimant@example.com',
      role: 'claimant',
      hasCompletedOnboarding: true,
    }
    expect(getRedirectPathForUser(user)).toBe('/app/dashboard')
  })

  it('redirects claimant with undefined hasCompletedOnboarding to /app/onboarding', () => {
    const user: User = {
      id: '1',
      email: 'claimant@example.com',
      role: 'claimant',
      hasCompletedOnboarding: undefined,
    }
    expect(getRedirectPathForUser(user)).toBe('/app/onboarding')
  })

  it('redirects coach to /staff/work-coach', () => {
    const user: User = {
      id: '2',
      email: 'coach@example.com',
      role: 'coach',
    }
    expect(getRedirectPathForUser(user)).toBe('/staff/work-coach')
  })

  it('redirects admin to /staff/dwp', () => {
    const user: User = {
      id: '3',
      email: 'admin@example.com',
      role: 'admin',
    }
    expect(getRedirectPathForUser(user)).toBe('/staff/dwp')
  })

  it('redirects unknown role to /login', () => {
    const user = {
      id: '4',
      email: 'unknown@example.com',
      role: 'unknown' as any,
    }
    expect(getRedirectPathForUser(user)).toBe('/login')
  })
})

import { describe, it, expect } from 'vitest'
import { isProfileComplete } from '../AuthContext'
import type { ClaimantProfileResponse } from '@/types/onboarding'

describe('AuthContext - isProfileComplete', () => {
  it('returns false for null profile', () => {
    expect(isProfileComplete(null)).toBe(false)
  })

  it('returns false for undefined profile', () => {
    expect(isProfileComplete(undefined as any)).toBe(false)
  })

  it('returns false for non-object profile', () => {
    expect(isProfileComplete('string' as any)).toBe(false)
    expect(isProfileComplete(123 as any)).toBe(false)
  })

  it('returns true if skippedOnboarding is true', () => {
    const profile: ClaimantProfileResponse = {
      skippedOnboarding: true,
    }
    expect(isProfileComplete(profile)).toBe(true)
  })

  it('returns true with valid firstName and email', () => {
    const profile: ClaimantProfileResponse = {
      firstName: 'John',
      email: 'john@example.com',
    }
    expect(isProfileComplete(profile)).toBe(true)
  })

  it('returns true with valid first_name (snake_case) and email', () => {
    const profile: ClaimantProfileResponse = {
      first_name: 'Jane',
      email: 'jane@example.com',
    }
    expect(isProfileComplete(profile)).toBe(true)
  })

  it('returns false if firstName is empty string', () => {
    const profile: ClaimantProfileResponse = {
      firstName: '',
      email: 'test@example.com',
    }
    expect(isProfileComplete(profile)).toBe(false)
  })

  it('returns false if firstName is only whitespace', () => {
    const profile: ClaimantProfileResponse = {
      firstName: '   ',
      email: 'test@example.com',
    }
    expect(isProfileComplete(profile)).toBe(false)
  })

  it('returns false if email is missing', () => {
    const profile: ClaimantProfileResponse = {
      firstName: 'John',
    }
    expect(isProfileComplete(profile)).toBe(false)
  })

  it('returns false if email is empty string', () => {
    const profile: ClaimantProfileResponse = {
      firstName: 'John',
      email: '',
    }
    expect(isProfileComplete(profile)).toBe(false)
  })

  it('returns false if email is only whitespace', () => {
    const profile: ClaimantProfileResponse = {
      firstName: 'John',
      email: '   ',
    }
    expect(isProfileComplete(profile)).toBe(false)
  })

  it('returns false if both firstName and email are missing', () => {
    const profile: ClaimantProfileResponse = {}
    expect(isProfileComplete(profile)).toBe(false)
  })

  it('prefers firstName over first_name when both present', () => {
    const profile: ClaimantProfileResponse = {
      firstName: 'John',
      first_name: '',
      email: 'john@example.com',
    }
    expect(isProfileComplete(profile)).toBe(true)
  })

  it('falls back to first_name when firstName is not present', () => {
    const profile: ClaimantProfileResponse = {
      first_name: 'Jane',
      email: 'jane@example.com',
    }
    expect(isProfileComplete(profile)).toBe(true)
  })
})

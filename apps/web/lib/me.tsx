'use client'

import { createContext, useContext } from 'react'
import type { Me } from './api'

/** The logged-in user, loaded once by the app layout. */
export const MeContext = createContext<{ me: Me; reload: () => Promise<void> } | null>(null)

export function useMe() {
  const value = useContext(MeContext)
  if (!value) throw new Error('useMe must be used inside the app layout')
  return value
}

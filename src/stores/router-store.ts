import { create } from 'zustand'
import type { RoutePath } from '@/types'

interface RouterStore {
  currentRoute: RoutePath
  params: Record<string, string>
  history: Array<{ route: RoutePath; params: Record<string, string> }>
  navigate: (route: RoutePath, params?: Record<string, string>) => void
  goBack: () => void
}

export const useRouterStore = create<RouterStore>((set, get) => ({
  currentRoute: 'home',
  params: {},
  history: [{ route: 'home', params: {} }],

  navigate: (route, params = {}) => {
    const state = get()
    set({
      currentRoute: route,
      params,
      history: [...state.history, { route, params }],
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  },

  goBack: () => {
    const state = get()
    if (state.history.length > 1) {
      const newHistory = state.history.slice(0, -1)
      const lastEntry = newHistory[newHistory.length - 1]
      set({
        currentRoute: lastEntry.route,
        params: lastEntry.params,
        history: newHistory,
      })
    }
  },
}))

// Expose store on window for debugging/admin navigation
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__routerStore = useRouterStore
}

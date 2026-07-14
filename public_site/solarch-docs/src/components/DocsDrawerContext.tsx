import { createContext, useContext, useState, type ReactNode } from 'react'

interface DocsDrawerContextType {
  open: boolean
  setOpen: (v: boolean) => void
}

const DocsDrawerContext = createContext<DocsDrawerContextType>({
  open: false,
  setOpen: () => {},
})

export function DocsDrawerProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <DocsDrawerContext.Provider value={{ open, setOpen }}>
      {children}
    </DocsDrawerContext.Provider>
  )
}

export function useDocsDrawer() {
  return useContext(DocsDrawerContext)
}

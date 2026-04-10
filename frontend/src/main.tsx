import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { LibraryProvider, ThemeProvider } from './context'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <LibraryProvider>
        <App />
      </LibraryProvider>
    </ThemeProvider>
  </StrictMode>,
)

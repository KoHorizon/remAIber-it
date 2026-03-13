import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { LibraryProvider } from './context/LibraryContext'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LibraryProvider>
      <App />
    </LibraryProvider>
  </StrictMode>,
)

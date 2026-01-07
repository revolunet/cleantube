import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Routes, Route } from 'react-router-dom'
import { NuqsAdapter } from 'nuqs/adapters/react'
import './index.css'
import App from './App.tsx'
import { HomePage } from './components/HomePage.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <NuqsAdapter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/:category" element={<App />} />
        </Routes>
      </NuqsAdapter>
    </HashRouter>
  </StrictMode>,
)

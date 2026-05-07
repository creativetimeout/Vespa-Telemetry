import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import './i18n'
import App from './App.jsx'
import { DbProvider } from './lib/db/DbProvider.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <DbProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </DbProvider>
  </StrictMode>,
)

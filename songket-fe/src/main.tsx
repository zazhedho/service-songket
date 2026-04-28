import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { ConfirmProvider } from './components/common/ConfirmDialog'
import { ToastProvider } from './components/common/ToastProvider'
import './styles/app.css'
import './styles/auth.css'
import './styles/filters.css'
import './styles/quadrants.css'
import './styles/business.css'
import './styles/tables.css'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <ConfirmProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </ConfirmProvider>
    </BrowserRouter>
  </React.StrictMode>
)

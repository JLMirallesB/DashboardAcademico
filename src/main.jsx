import React from 'react'
import ReactDOM from 'react-dom/client'
import DashboardAcademico from './DashboardAcademico.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* Sin esto, cualquier error inesperado durante el render deja la página
        en blanco y sin mensaje. Ver components/ErrorBoundary.jsx. */}
    <ErrorBoundary>
      <DashboardAcademico />
    </ErrorBoundary>
  </React.StrictMode>,
)

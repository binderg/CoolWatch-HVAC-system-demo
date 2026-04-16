import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { PrimeReactProvider } from 'primereact/api'

// PrimeReact theme — swap to any theme under primereact/resources/themes/
import 'primereact/resources/themes/lara-dark-cyan/theme.css'
import 'primeicons/primeicons.css'
import 'primeflex/primeflex.css'

import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PrimeReactProvider>
      <App />
    </PrimeReactProvider>
  </StrictMode>,
)

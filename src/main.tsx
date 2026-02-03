import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { initGA4 } from './lib/ga4'
import { initFirebase } from './lib/firebase'
import { getBootstrapFirebaseConfig } from './lib/firebaseBootstrap'

initGA4()

async function bootstrap() {
  const config = await getBootstrapFirebaseConfig()
  initFirebase(config)
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
}

bootstrap()

import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import AuthProvider from './components/AuthProvider'
import './index.css'
import clarity from '@microsoft/clarity'

clarity.init("otu0u5aqbj")

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <AuthProvider>
      <App />
    </AuthProvider>
  </BrowserRouter>
);

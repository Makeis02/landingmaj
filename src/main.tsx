import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import AuthProvider from './components/AuthProvider'
import './index.css'
import clarity from '@microsoft/clarity'

clarity.init("otu0u5aqbj");

function initClarityOnInteraction() {
  const startClarity = () => {
    clarity.init("otu0u5aqbj");
    window.removeEventListener("scroll", startClarity);
    window.removeEventListener("click", startClarity);
  };
  window.addEventListener("scroll", startClarity, { once: true });
  window.addEventListener("click", startClarity, { once: true });
}
initClarityOnInteraction();

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <AuthProvider>
      <App />
    </AuthProvider>
  </BrowserRouter>
);

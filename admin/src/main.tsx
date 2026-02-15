import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './i18n'
import './index.scss'

createRoot(document.getElementById('root')!).render(<App />)

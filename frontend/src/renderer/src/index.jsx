import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App'
import './index.css'

// Check if electron API is available
const isElectron = window.electronAPI !== undefined;

const root = ReactDOM.createRoot(document.getElementById('root'))
root.render(
  <React.StrictMode>
    <BrowserRouter basename={isElectron ? '' : process.env.PUBLIC_URL}>
      <App />
      <Toaster position="top-right" />
    </BrowserRouter>
  </React.StrictMode>
)
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const container = document.getElementById('root')!
const root = createRoot(container)

root.render(<App />)

// Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      })

      console.log('[SW] Registered successfully:', registration.scope)

      // Handle service worker updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New version available, show update prompt
              showUpdatePrompt()
            }
          })
        }
      })

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'SYNC_COMPLETED') {
          console.log('[SW] Background sync completed')
          // You can show a toast notification here
        }
      })

    } catch (error) {
      console.error('[SW] Registration failed:', error)
    }
  })
}

// Enhanced function to show update prompt with better UX
function showUpdatePrompt() {
  // Check if update prompt is already shown
  if (document.getElementById('sw-update-prompt')) {
    return;
  }

  const updateToast = document.createElement('div')
  updateToast.id = 'sw-update-prompt'
  updateToast.innerHTML = `
    <div style="
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #2196f3;
      color: white;
      padding: 20px;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.2);
      z-index: 2000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 320px;
      min-width: 280px;
      animation: slideIn 0.3s ease-out;
      backdrop-filter: blur(10px);
    ">
      <div style="display: flex; align-items: center; margin-bottom: 12px;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style="margin-right: 8px;">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
        <strong style="font-size: 16px;">새 버전 업데이트</strong>
      </div>
      <p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.4; opacity: 0.9;">
        더 나은 성능과 새로운 기능이 준비되었습니다. 지금 업데이트하시겠습니까?
      </p>
      <div style="display: flex; gap: 8px;">
        <button id="sw-update-btn" style="
          background: white;
          color: #2196f3;
          border: none;
          padding: 10px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
          font-size: 14px;
          flex: 1;
          transition: all 0.2s;
        " onmouseover="this.style.background='#f5f5f5'" onmouseout="this.style.background='white'">
          지금 업데이트
        </button>
        <button id="sw-dismiss-btn" style="
          background: transparent;
          color: white;
          border: 1px solid rgba(255,255,255,0.3);
          padding: 10px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s;
        " onmouseover="this.style.background='rgba(255,255,255,0.1)'" onmouseout="this.style.background='transparent'">
          나중에
        </button>
      </div>
      <div style="
        position: absolute;
        top: 8px;
        right: 8px;
        width: 24px;
        height: 24px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        background: rgba(255,255,255,0.1);
        transition: background 0.2s;
      " id="sw-close-btn" onmouseover="this.style.background='rgba(255,255,255,0.2)'" onmouseout="this.style.background='rgba(255,255,255,0.1)'">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
        </svg>
      </div>
    </div>
    <style>
      @keyframes slideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      @keyframes slideOut {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(100%);
          opacity: 0;
        }
      }
    </style>
  `
  
  document.body.appendChild(updateToast)
  
  // Add event listeners
  const updateBtn = document.getElementById('sw-update-btn')
  const dismissBtn = document.getElementById('sw-dismiss-btn')
  const closeBtn = document.getElementById('sw-close-btn')
  
  const removePrompt = () => {
    const prompt = document.getElementById('sw-update-prompt')
    if (prompt) {
      prompt.style.animation = 'slideOut 0.3s ease-in'
      setTimeout(() => {
        prompt.remove()
      }, 300)
    }
  }
  
  updateBtn?.addEventListener('click', () => {
    // Track update action
    if (typeof window !== 'undefined' && 'gtag' in window && typeof (window as { gtag?: (...args: unknown[]) => void }).gtag === 'function') {
      ((window as { gtag: (...args: unknown[]) => void }).gtag)('event', 'sw_update', {
        event_category: 'engagement',
        event_label: 'User Updated SW'
      });
    }
    
    removePrompt()
    
    // Show loading indicator
    const loadingToast = document.createElement('div')
    loadingToast.innerHTML = `
      <div style="
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: rgba(0,0,0,0.8);
        color: white;
        padding: 16px 20px;
        border-radius: 8px;
        z-index: 2000;
        font-family: inherit;
        display: flex;
        align-items: center;
        gap: 12px;
      ">
        <div style="
          width: 20px;
          height: 20px;
          border: 2px solid #333;
          border-top: 2px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        "></div>
        업데이트 중...
      </div>
      <style>
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    `
    document.body.appendChild(loadingToast)
    
    setTimeout(() => {
      window.location.reload()
    }, 500)
  })
  
  dismissBtn?.addEventListener('click', removePrompt)
  closeBtn?.addEventListener('click', removePrompt)
  
  // Auto-dismiss after 30 seconds
  setTimeout(() => {
    if (document.getElementById('sw-update-prompt')) {
      removePrompt()
    }
  }, 30000)
}

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Overriding window.alert with a premium custom modal dialog
window.alert = function (message) {
  const existingAlert = document.getElementById('custom-alert-overlay');
  if (existingAlert) {
    existingAlert.remove();
  }

  const overlay = document.createElement('div');
  overlay.id = 'custom-alert-overlay';
  overlay.style.position = 'fixed';
  overlay.style.top = '0';
  overlay.style.left = '0';
  overlay.style.width = '100vw';
  overlay.style.height = '100vh';
  overlay.style.backgroundColor = 'rgba(15, 23, 42, 0.6)';
  overlay.style.backdropFilter = 'blur(4px)';
  overlay.style.display = 'flex';
  overlay.style.justifyContent = 'center';
  overlay.style.alignItems = 'center';
  overlay.style.zIndex = '999999';
  overlay.style.opacity = '0';
  overlay.style.transition = 'opacity 0.2s ease';

  const card = document.createElement('div');
  card.style.backgroundColor = '#ffffff';
  card.style.borderRadius = '16px';
  card.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)';
  card.style.width = '90%';
  card.style.maxWidth = '400px';
  card.style.padding = '1.5rem';
  card.style.boxSizing = 'border-box';
  card.style.textAlign = 'center';
  card.style.transform = 'scale(0.95)';
  card.style.transition = 'transform 0.2s ease';

  const icon = document.createElement('div');
  icon.innerHTML = '🔔';
  icon.style.fontSize = '2.5rem';
  icon.style.marginBottom = '1rem';

  const msgText = document.createElement('div');
  msgText.innerText = message;
  msgText.style.fontSize = '1.05rem';
  msgText.style.color = '#1e293b';
  msgText.style.lineHeight = '1.6';
  msgText.style.marginBottom = '1.5rem';
  msgText.style.fontWeight = '500';
  msgText.style.whiteSpace = 'pre-line';

  const btn = document.createElement('button');
  btn.innerText = 'ตกลง';
  btn.style.width = '100%';
  btn.style.padding = '0.75rem';
  btn.style.backgroundColor = '#e11d48';
  btn.style.color = '#ffffff';
  btn.style.border = 'none';
  btn.style.borderRadius = '8px';
  btn.style.fontSize = '1rem';
  btn.style.fontWeight = '600';
  btn.style.cursor = 'pointer';
  btn.style.transition = 'background-color 0.2s ease';

  btn.onmouseover = () => {
    btn.style.backgroundColor = '#be123c';
  };
  btn.onmouseout = () => {
    btn.style.backgroundColor = '#e11d48';
  };

  const closeAlert = () => {
    overlay.style.opacity = '0';
    card.style.transform = 'scale(0.95)';
    setTimeout(() => {
      overlay.remove();
    }, 200);
  };

  btn.onclick = closeAlert;
  
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
      e.preventDefault();
      closeAlert();
      document.removeEventListener('keydown', handleKeyDown);
    }
  };
  document.addEventListener('keydown', handleKeyDown);

  card.appendChild(icon);
  card.appendChild(msgText);
  card.appendChild(btn);
  overlay.appendChild(card);
  document.body.appendChild(overlay);

  requestAnimationFrame(() => {
    overlay.style.opacity = '1';
    card.style.transform = 'scale(1)';
  });
};

// Custom async confirmation dialog to replace native window.confirm
window.showConfirm = function (message) {
  return new Promise((resolve) => {
    const existing = document.getElementById('custom-confirm-overlay');
    if (existing) {
      existing.remove();
    }

    const overlay = document.createElement('div');
    overlay.id = 'custom-confirm-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.backgroundColor = 'rgba(15, 23, 42, 0.6)';
    overlay.style.backdropFilter = 'blur(4px)';
    overlay.style.display = 'flex';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';
    overlay.style.zIndex = '999999';
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 0.2s ease';

    const card = document.createElement('div');
    card.style.backgroundColor = '#ffffff';
    card.style.borderRadius = '16px';
    card.style.boxShadow = '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)';
    card.style.width = '90%';
    card.style.maxWidth = '400px';
    card.style.padding = '1.5rem';
    card.style.boxSizing = 'border-box';
    card.style.textAlign = 'center';
    card.style.transform = 'scale(0.95)';
    card.style.transition = 'transform 0.2s ease';

    const icon = document.createElement('div');
    icon.innerHTML = '❓';
    icon.style.fontSize = '2.5rem';
    icon.style.marginBottom = '1rem';

    const msgText = document.createElement('div');
    msgText.innerText = message;
    msgText.style.fontSize = '1.05rem';
    msgText.style.color = '#1e293b';
    msgText.style.lineHeight = '1.6';
    msgText.style.marginBottom = '1.5rem';
    msgText.style.fontWeight = '500';
    msgText.style.whiteSpace = 'pre-line';

    const btnContainer = document.createElement('div');
    btnContainer.style.display = 'flex';
    btnContainer.style.gap = '0.75rem';

    const btnCancel = document.createElement('button');
    btnCancel.innerText = 'ยกเลิก';
    btnCancel.style.flex = '1';
    btnCancel.style.padding = '0.75rem';
    btnCancel.style.backgroundColor = '#f1f5f9';
    btnCancel.style.color = '#64748b';
    btnCancel.style.border = 'none';
    btnCancel.style.borderRadius = '8px';
    btnCancel.style.fontSize = '1rem';
    btnCancel.style.fontWeight = '600';
    btnCancel.style.cursor = 'pointer';
    btnCancel.style.transition = 'background-color 0.2s ease';

    btnCancel.onmouseover = () => {
      btnCancel.style.backgroundColor = '#e2e8f0';
    };
    btnCancel.onmouseout = () => {
      btnCancel.style.backgroundColor = '#f1f5f9';
    };

    const btnConfirm = document.createElement('button');
    btnConfirm.innerText = 'ยืนยัน';
    btnConfirm.style.flex = '1';
    btnConfirm.style.padding = '0.75rem';
    btnConfirm.style.backgroundColor = '#e11d48';
    btnConfirm.style.color = '#ffffff';
    btnConfirm.style.border = 'none';
    btnConfirm.style.borderRadius = '8px';
    btnConfirm.style.fontSize = '1rem';
    btnConfirm.style.fontWeight = '600';
    btnConfirm.style.cursor = 'pointer';
    btnConfirm.style.transition = 'background-color 0.2s ease';

    btnConfirm.onmouseover = () => {
      btnConfirm.style.backgroundColor = '#be123c';
    };
    btnConfirm.onmouseout = () => {
      btnConfirm.style.backgroundColor = '#e11d48';
    };

    const closeConfirm = (result) => {
      overlay.style.opacity = '0';
      card.style.transform = 'scale(0.95)';
      setTimeout(() => {
        overlay.remove();
        resolve(result);
      }, 200);
    };

    btnCancel.onclick = () => closeConfirm(false);
    btnConfirm.onclick = () => closeConfirm(true);

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeConfirm(false);
        document.removeEventListener('keydown', handleKeyDown);
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    btnContainer.appendChild(btnCancel);
    btnContainer.appendChild(btnConfirm);
    card.appendChild(icon);
    card.appendChild(msgText);
    card.appendChild(btnContainer);
    overlay.appendChild(card);
    document.body.appendChild(overlay);

    requestAnimationFrame(() => {
      overlay.style.opacity = '1';
      card.style.transform = 'scale(1)';
    });
  });
};

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

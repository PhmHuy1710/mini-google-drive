// Modern Dialog Manager
// Replaces browser alerts, confirms, and prompts with modern UI components

class DialogManager {
  constructor() {
    this.activeDialogs = new Set();
    this.setupStyles();
  }

  setupStyles() {
    // Inject dialog styles if not already present
    if (!document.getElementById('dialog-styles')) {
      const style = document.createElement('style');
      style.id = 'dialog-styles';
      style.textContent = `
        .dialog-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          opacity: 0;
          transition: opacity 0.2s ease;
        }

        .dialog-overlay.show {
          opacity: 1;
        }

        .dialog {
          background: var(--bg-secondary);
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
          max-width: 500px;
          width: 90%;
          max-height: 90vh;
          overflow: hidden;
          transform: translateY(-20px);
          transition: transform 0.3s ease;
        }

        .dialog-overlay.show .dialog {
          transform: translateY(0);
        }

        .dialog-header {
          padding: 20px 24px 16px;
          border-bottom: 1px solid var(--border-primary);
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .dialog-icon {
          font-size: 24px;
          color: var(--text-accent);
        }

        .dialog-title {
          font-size: 18px;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0;
        }

        .dialog-body {
          padding: 20px 24px;
        }

        .dialog-message {
          font-size: 16px;
          color: var(--text-secondary);
          line-height: 1.5;
          margin: 0 0 20px 0;
        }

        .dialog-input {
          width: 100%;
          padding: 12px 16px;
          border: 2px solid var(--border-primary);
          border-radius: 8px;
          font-size: 16px;
          background: var(--bg-primary);
          color: var(--text-primary);
          transition: border-color 0.2s ease;
        }

        .dialog-input:focus {
          outline: none;
          border-color: var(--text-accent);
        }

        .dialog-actions {
          padding: 16px 24px 20px;
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        }

        .dialog-btn {
          padding: 10px 20px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          min-width: 80px;
        }

        .dialog-btn-primary {
          background: var(--text-accent);
          color: #fff;
        }

        .dialog-btn-primary:hover {
          background: var(--text-primary);
          transform: translateY(-1px);
        }

        .dialog-btn-secondary {
          background: var(--bg-tertiary);
          color: var(--text-secondary);
          border: 1px solid var(--border-primary);
        }

        .dialog-btn-secondary:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }

        .dialog-btn-danger {
          background: #f44336;
          color: #fff;
        }

        .dialog-btn-danger:hover {
          background: #d32f2f;
          transform: translateY(-1px);
        }

        /* Mobile responsive */
        @media (max-width: 480px) {
          .dialog {
            width: 95%;
            margin: 20px;
          }

          .dialog-header,
          .dialog-body,
          .dialog-actions {
            padding-left: 16px;
            padding-right: 16px;
          }

          .dialog-actions {
            flex-direction: column-reverse;
          }

          .dialog-btn {
            width: 100%;
            min-height: 44px;
          }
        }
      `;
      document.head.appendChild(style);
    }
  }

  // Show confirmation dialog
  showConfirm(options) {
    const {
      title = 'Xác nhận',
      message,
      confirmText = 'Đồng ý',
      cancelText = 'Hủy',
      type = 'warning', // warning, danger, info
      onConfirm,
      onCancel
    } = options;

    return new Promise((resolve) => {
      const dialogId = 'dialog-' + Date.now();
      const overlay = document.createElement('div');
      overlay.className = 'dialog-overlay';
      overlay.id = dialogId;

      const iconClass = type === 'danger' ? 'mdi-alert-circle' : 
                       type === 'info' ? 'mdi-information' : 'mdi-alert-outline';
      
      const confirmBtnClass = type === 'danger' ? 'dialog-btn-danger' : 'dialog-btn-primary';

      overlay.innerHTML = `
        <div class="dialog">
          <div class="dialog-header">
            <span class="mdi ${iconClass} dialog-icon"></span>
            <h3 class="dialog-title">${title}</h3>
          </div>
          <div class="dialog-body">
            <p class="dialog-message">${message}</p>
          </div>
          <div class="dialog-actions">
            <button class="dialog-btn dialog-btn-secondary" data-action="cancel">${cancelText}</button>
            <button class="dialog-btn ${confirmBtnClass}" data-action="confirm">${confirmText}</button>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);
      this.activeDialogs.add(dialogId);

      // Show with animation
      setTimeout(() => overlay.classList.add('show'), 10);

      // Focus confirm button
      setTimeout(() => {
        const confirmBtn = overlay.querySelector('[data-action="confirm"]');
        if (confirmBtn) confirmBtn.focus();
      }, 100);

      // Handle clicks
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          this.closeDialog(dialogId, false, resolve, onCancel);
        }
      });

      overlay.querySelector('[data-action="confirm"]').addEventListener('click', () => {
        this.closeDialog(dialogId, true, resolve, onConfirm);
      });

      overlay.querySelector('[data-action="cancel"]').addEventListener('click', () => {
        this.closeDialog(dialogId, false, resolve, onCancel);
      });

      // Handle escape key
      const handleEscape = (e) => {
        if (e.key === 'Escape') {
          this.closeDialog(dialogId, false, resolve, onCancel);
          document.removeEventListener('keydown', handleEscape);
        }
      };
      document.addEventListener('keydown', handleEscape);
    });
  }

  // Show prompt dialog
  showPrompt(options) {
    const {
      title = 'Nhập thông tin',
      message,
      placeholder = '',
      defaultValue = '',
      confirmText = 'Đồng ý',
      cancelText = 'Hủy',
      onConfirm,
      onCancel
    } = options;

    return new Promise((resolve) => {
      const dialogId = 'dialog-' + Date.now();
      const overlay = document.createElement('div');
      overlay.className = 'dialog-overlay';
      overlay.id = dialogId;

      overlay.innerHTML = `
        <div class="dialog">
          <div class="dialog-header">
            <span class="mdi mdi-pencil dialog-icon"></span>
            <h3 class="dialog-title">${title}</h3>
          </div>
          <div class="dialog-body">
            <p class="dialog-message">${message}</p>
            <input type="text" class="dialog-input" placeholder="${placeholder}" value="${defaultValue}">
          </div>
          <div class="dialog-actions">
            <button class="dialog-btn dialog-btn-secondary" data-action="cancel">${cancelText}</button>
            <button class="dialog-btn dialog-btn-primary" data-action="confirm">${confirmText}</button>
          </div>
        </div>
      `;

      document.body.appendChild(overlay);
      this.activeDialogs.add(dialogId);

      const input = overlay.querySelector('.dialog-input');
      
      // Show with animation
      setTimeout(() => overlay.classList.add('show'), 10);

      // Focus and select input
      setTimeout(() => {
        input.focus();
        input.select();
      }, 100);

      // Handle clicks
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
          this.closeDialog(dialogId, null, resolve, onCancel);
        }
      });

      overlay.querySelector('[data-action="confirm"]').addEventListener('click', () => {
        const value = input.value.trim();
        this.closeDialog(dialogId, value, resolve, onConfirm);
      });

      overlay.querySelector('[data-action="cancel"]').addEventListener('click', () => {
        this.closeDialog(dialogId, null, resolve, onCancel);
      });

      // Handle enter and escape keys
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          const value = input.value.trim();
          this.closeDialog(dialogId, value, resolve, onConfirm);
        } else if (e.key === 'Escape') {
          this.closeDialog(dialogId, null, resolve, onCancel);
        }
      });
    });
  }

  closeDialog(dialogId, result, resolve, callback) {
    const overlay = document.getElementById(dialogId);
    if (!overlay) return;

    overlay.classList.remove('show');
    setTimeout(() => {
      overlay.remove();
      this.activeDialogs.delete(dialogId);
    }, 200);

    if (callback) callback(result);
    resolve(result);
  }

  // Close all dialogs
  closeAll() {
    this.activeDialogs.forEach(dialogId => {
      const overlay = document.getElementById(dialogId);
      if (overlay) {
        overlay.classList.remove('show');
        setTimeout(() => overlay.remove(), 200);
      }
    });
    this.activeDialogs.clear();
  }
}

// Create global instance
const dialogManager = new DialogManager();

// Export for global access
window.dialogManager = dialogManager;

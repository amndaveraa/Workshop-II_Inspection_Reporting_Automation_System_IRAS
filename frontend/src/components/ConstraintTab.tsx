import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import './ConstraintTab.css'; // We'll create this CSS file

interface ConstraintTabProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean; // For red buttons (if needed)
}

const ConstraintTab: React.FC<ConstraintTabProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDestructive = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="constraint-backdrop">
      <div className="constraint-modal">
        <div className="constraint-header">
          <div className="constraint-title-wrapper">
             <AlertTriangle className="constraint-icon" size={24} color={isDestructive? "#ef4444" : "#f59e0b"} />
             <h3>{title}</h3>
          </div>
          <button onClick={onClose} className="constraint-close-btn">
            <X size={20} />
          </button>
        </div>
        
        <div className="constraint-body">
          <p>{message}</p>
        </div>

        <div className="constraint-footer">
          <button onClick={onClose} className="constraint-btn constraint-cancel">
            {cancelLabel}
          </button>
          <button 
            onClick={() => {
              onConfirm();
              onClose();
            }} 
            className={`constraint-btn constraint-confirm ${isDestructive ? 'btn-red' : 'btn-blue'}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConstraintTab;
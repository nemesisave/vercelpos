import React from 'react';
import { useTranslations } from '../context/LanguageContext';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  confirmButtonClass?: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    title, 
    message, 
    confirmText, 
    cancelText, 
    confirmButtonClass = 'bg-red-600 hover:bg-red-700 focus:ring-red-500' 
}) => {
  const { t } = useTranslations();
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-[70] p-4" role="dialog" aria-modal="true" aria-labelledby="confirmation-modal-title">
      <div className="bg-surface rounded-lg shadow-xl w-full max-w-md">
        <div className="p-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126z" />
                </svg>
            </div>
            <h3 id="confirmation-modal-title" className="text-xl font-bold text-text-primary mt-4">{title}</h3>
            <div className="mt-2 text-sm text-text-secondary">
                {message}
            </div>
        </div>
        <div className="p-4 bg-background flex justify-center space-x-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-text-primary bg-surface border border-border rounded-md shadow-sm hover:bg-background focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary">
                {cancelText || t('adminPanel.inventoryCount.cancel')}
            </button>
            <button 
                type="button" 
                onClick={onConfirm} 
                className={`px-4 py-2 text-sm font-medium text-white border border-transparent rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 ${confirmButtonClass}`}
            >
                {confirmText || t('adminPanel.users.delete')}
            </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
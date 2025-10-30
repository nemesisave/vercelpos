import React, { useState, useEffect } from 'react';
import type { Customer, NewCustomerPayload, CustomerUpdatePayload } from '../types';
import { useTranslations } from '../context/LanguageContext';

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: NewCustomerPayload | CustomerUpdatePayload, id?: number) => void;
  customerToEdit?: Customer | null;
}

const CustomerModal: React.FC<CustomerModalProps> = ({ isOpen, onClose, onSave, customerToEdit }) => {
    const { t } = useTranslations();
    const isEditMode = !!customerToEdit;

    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [address, setAddress] = useState('');
    const [notes, setNotes] = useState('');
    
    useEffect(() => {
        if (isOpen) {
            setName(customerToEdit?.name || '');
            setPhone(customerToEdit?.phone || '');
            setEmail(customerToEdit?.email || '');
            setAddress(customerToEdit?.address || '');
            setNotes(customerToEdit?.notes || '');
        }
    }, [isOpen, customerToEdit]);


    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name) {
            alert('Customer name is required.');
            return;
        }

        const payload = { name, phone, email, address, notes };
        onSave(payload, customerToEdit?.id);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[60] p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
            <form onSubmit={handleSubmit}>
            <div className="p-6 border-b">
                <h2 className="text-xl font-bold text-gray-800">
                    {isEditMode ? t('addCustomerModal.editTitle') : t('addCustomerModal.title')}
                </h2>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="cust-name" className="block text-sm font-medium text-gray-700">{t('addCustomerModal.name')}</label>
                        <input type="text" id="cust-name" value={name} onChange={e => setName(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" required />
                    </div>
                    <div>
                        <label htmlFor="cust-phone" className="block text-sm font-medium text-gray-700">{t('addCustomerModal.phone')}</label>
                        <input type="tel" id="cust-phone" value={phone} onChange={e => setPhone(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                    </div>
                </div>
                <div>
                    <label htmlFor="cust-email" className="block text-sm font-medium text-gray-700">{t('addCustomerModal.email')}</label>
                    <input type="email" id="cust-email" value={email} onChange={e => setEmail(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                </div>
                <div>
                    <label htmlFor="cust-address" className="block text-sm font-medium text-gray-700">{t('addCustomerModal.address')}</label>
                    <input type="text" id="cust-address" value={address} onChange={e => setAddress(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                </div>
                <div>
                    <label htmlFor="cust-notes" className="block text-sm font-medium text-gray-700">{t('addCustomerModal.notes')}</label>
                    <textarea id="cust-notes" value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                </div>
            </div>
            <div className="p-4 bg-gray-50 flex justify-end space-x-3">
                <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50">{t('addCustomerModal.cancel')}</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700">
                    {isEditMode ? t('addCustomerModal.save') : t('addCustomerModal.add')}
                </button>
            </div>
            </form>
        </div>
        </div>
    );
};

export default CustomerModal;

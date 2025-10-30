import React, { useState } from 'react';
import type { NewSupplierPayload } from '../types';
import { useTranslations } from '../context/LanguageContext';

interface AddSupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddSupplier: (data: NewSupplierPayload) => void;
}

const AddSupplierModal: React.FC<AddSupplierModalProps> = ({ isOpen, onClose, onAddSupplier }) => {
  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const { t } = useTranslations();

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !contactPerson) {
        alert(t('app.fillAllFields'));
        return;
    }
    
    onAddSupplier({ name, contactPerson, phone, email, address, notes });
    
    // Reset form and close
    setName('');
    setContactPerson('');
    setPhone('');
    setEmail('');
    setAddress('');
    setNotes('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[60] p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
        <form onSubmit={handleSubmit}>
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold text-gray-800">{t('addSupplierModal.title')}</h2>
          </div>
          <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="sup-name" className="block text-sm font-medium text-gray-700">{t('addSupplierModal.name')}</label>
                <input type="text" id="sup-name" value={name} onChange={e => setName(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" required />
              </div>
              <div>
                <label htmlFor="sup-contact" className="block text-sm font-medium text-gray-700">{t('addSupplierModal.contact')}</label>
                <input type="text" id="sup-contact" value={contactPerson} onChange={e => setContactPerson(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" required />
              </div>
              <div>
                <label htmlFor="sup-phone" className="block text-sm font-medium text-gray-700">{t('addSupplierModal.phone')}</label>
                <input type="tel" id="sup-phone" value={phone} onChange={e => setPhone(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
              </div>
              <div>
                <label htmlFor="sup-email" className="block text-sm font-medium text-gray-700">{t('addSupplierModal.email')}</label>
                <input type="email" id="sup-email" value={email} onChange={e => setEmail(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
              </div>
            </div>
             <div>
              <label htmlFor="sup-address" className="block text-sm font-medium text-gray-700">{t('addSupplierModal.address')}</label>
              <input type="text" id="sup-address" value={address} onChange={e => setAddress(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
            </div>
             <div>
              <label htmlFor="sup-notes" className="block text-sm font-medium text-gray-700">{t('addSupplierModal.notes')}</label>
              <textarea id="sup-notes" value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
            </div>
          </div>
          <div className="p-4 bg-gray-50 flex justify-end space-x-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50">{t('addSupplierModal.cancel')}</button>
            <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700">{t('addSupplierModal.add')}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddSupplierModal;
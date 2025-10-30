import React, { useState, useEffect } from 'react';
import type { Supplier, SupplierUpdatePayload } from '../types';
import { useTranslations } from '../context/LanguageContext';

interface EditSupplierModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplierToEdit: Supplier;
  onUpdateSupplier: (id: number, data: SupplierUpdatePayload) => void;
}

const EditSupplierModal: React.FC<EditSupplierModalProps> = ({ isOpen, onClose, supplierToEdit, onUpdateSupplier }) => {
  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const { t } = useTranslations();

  useEffect(() => {
    if (supplierToEdit) {
        setName(supplierToEdit.name);
        setContactPerson(supplierToEdit.contactPerson);
        setPhone(supplierToEdit.phone);
        setEmail(supplierToEdit.email);
        setAddress(supplierToEdit.address || '');
        setNotes(supplierToEdit.notes || '');
    }
  }, [supplierToEdit]);


  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !contactPerson) {
        alert(t('app.fillAllFields'));
        return;
    }
    
    onUpdateSupplier(supplierToEdit.id, { name, contactPerson, phone, email, address, notes });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[60] p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
        <form onSubmit={handleSubmit}>
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold text-gray-800">{t('addSupplierModal.editTitle')}</h2>
          </div>
          <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="edit-sup-name" className="block text-sm font-medium text-gray-700">{t('addSupplierModal.name')}</label>
                <input type="text" id="edit-sup-name" value={name} onChange={e => setName(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" required />
              </div>
              <div>
                <label htmlFor="edit-sup-contact" className="block text-sm font-medium text-gray-700">{t('addSupplierModal.contact')}</label>
                <input type="text" id="edit-sup-contact" value={contactPerson} onChange={e => setContactPerson(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" required />
              </div>
              <div>
                <label htmlFor="edit-sup-phone" className="block text-sm font-medium text-gray-700">{t('addSupplierModal.phone')}</label>
                <input type="tel" id="edit-sup-phone" value={phone} onChange={e => setPhone(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
              </div>
              <div>
                <label htmlFor="edit-sup-email" className="block text-sm font-medium text-gray-700">{t('addSupplierModal.email')}</label>
                <input type="email" id="edit-sup-email" value={email} onChange={e => setEmail(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
              </div>
            </div>
             <div>
              <label htmlFor="edit-sup-address" className="block text-sm font-medium text-gray-700">{t('addSupplierModal.address')}</label>
              <input type="text" id="edit-sup-address" value={address} onChange={e => setAddress(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
            </div>
             <div>
              <label htmlFor="edit-sup-notes" className="block text-sm font-medium text-gray-700">{t('addSupplierModal.notes')}</label>
              <textarea id="edit-sup-notes" value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
            </div>
          </div>
          <div className="p-4 bg-gray-50 flex justify-end space-x-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50">{t('addSupplierModal.cancel')}</button>
            <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700">{t('addSupplierModal.save')}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditSupplierModal;
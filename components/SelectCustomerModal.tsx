import React, { useState, useMemo, useEffect } from 'react';
import type { Customer, NewCustomerPayload } from '../types';
import { useTranslations } from '../context/LanguageContext';
import { useDebounce } from '../hooks/useDebounce';
import CustomerModal from './CustomerModal';

interface SelectCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  onSelectCustomer: (customer: Customer) => void;
  onAddCustomer: (data: NewCustomerPayload) => Promise<Customer>;
}

const SelectCustomerModal: React.FC<SelectCustomerModalProps> = ({ isOpen, onClose, customers, onSelectCustomer, onAddCustomer }) => {
  const { t } = useTranslations();
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const debouncedSearch = useDebounce(searchQuery, 300);

  useEffect(() => {
    if (!isOpen) {
        setSearchQuery('');
    }
  }, [isOpen]);

  const filteredCustomers = useMemo(() => {
    if (!debouncedSearch) return customers;
    const lowerQuery = debouncedSearch.toLowerCase();
    return customers.filter(c =>
      c.name.toLowerCase().includes(lowerQuery) ||
      c.email.toLowerCase().includes(lowerQuery) ||
      c.phone.toLowerCase().includes(lowerQuery)
    );
  }, [customers, debouncedSearch]);

  const handleSaveNewCustomer = async (data: NewCustomerPayload) => {
    try {
        const newCustomer = await onAddCustomer(data);
        setAddModalOpen(false);
        onSelectCustomer(newCustomer);
    } catch(e) {
        console.error("Failed to add and select new customer", e);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[60] p-4">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-lg flex flex-col h-[70vh]">
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold text-gray-800">{t('selectCustomerModal.title')}</h2>
          </div>
          <div className="p-4">
             <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={t('adminPanel.customers.searchPlaceholder')}
                className="w-full pl-4 pr-4 py-2 border border-gray-300 rounded-full"
                autoFocus
            />
          </div>
          <div className="flex-grow overflow-y-auto border-t">
            {filteredCustomers.length > 0 ? (
                <ul className="divide-y divide-gray-200">
                    {filteredCustomers.map(customer => (
                        <li key={customer.id}>
                            <button onClick={() => onSelectCustomer(customer)} className="w-full text-left p-4 hover:bg-gray-50 focus:outline-none focus:bg-blue-50">
                                <p className="font-semibold text-gray-800">{customer.name}</p>
                                <p className="text-sm text-gray-500">{customer.email}</p>
                            </button>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-center text-gray-500 p-8">{t('adminPanel.customers.noCustomers')}</p>
            )}
          </div>
          <div className="p-4 bg-gray-50 flex justify-between items-center mt-auto border-t">
            <button type="button" onClick={() => setAddModalOpen(true)} className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md shadow-sm hover:bg-green-700">
                {t('adminPanel.customers.addCustomer')}
            </button>
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50">
                {t('addCustomerModal.cancel')}
            </button>
          </div>
        </div>
      </div>
      <CustomerModal 
        isOpen={isAddModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSave={(data) => handleSaveNewCustomer(data as NewCustomerPayload)}
      />
    </>
  );
};

export default SelectCustomerModal;

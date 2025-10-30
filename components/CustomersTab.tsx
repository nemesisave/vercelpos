import React, { useState, useMemo } from 'react';
import type { Customer, NewCustomerPayload, CustomerUpdatePayload, CompletedOrder } from '../types';
import { useTranslations } from '../context/LanguageContext';
import { useDebounce } from '../hooks/useDebounce';
import { useCurrency } from '../context/CurrencyContext';
import CustomerModal from './CustomerModal';
import ConfirmationModal from './ConfirmationModal';

interface CustomersTabProps {
  customers: Customer[];
  completedOrders: CompletedOrder[];
  onAddCustomer: (data: NewCustomerPayload) => Promise<Customer>;
  onUpdateCustomer: (id: number, data: CustomerUpdatePayload) => void;
  onDeleteCustomer: (id: number) => void;
  onViewReceipt: (order: CompletedOrder) => void;
}

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; }> = ({ title, value, icon }) => (
  <div className="bg-white p-4 rounded-lg shadow-sm border flex items-start">
      <div className="bg-blue-100 text-blue-600 rounded-full p-3 mr-4">
          {icon}
      </div>
      <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-800">{value}</p>
      </div>
  </div>
);

const CustomersTab: React.FC<CustomersTabProps> = ({ customers, completedOrders, onAddCustomer, onUpdateCustomer, onDeleteCustomer, onViewReceipt }) => {
    const { t } = useTranslations();
    const { formatCurrency } = useCurrency();
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setModalOpen] = useState(false);
    const [customerToEdit, setCustomerToEdit] = useState<Customer | null>(null);
    const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
    const debouncedSearch = useDebounce(searchQuery, 300);

    const filteredCustomers = useMemo(() => {
        if (!debouncedSearch) return customers;
        const lowerQuery = debouncedSearch.toLowerCase();
        return customers.filter(c => 
            c.name.toLowerCase().includes(lowerQuery) ||
            c.email.toLowerCase().includes(lowerQuery) ||
            c.phone.toLowerCase().includes(lowerQuery)
        );
    }, [customers, debouncedSearch]);

    const { customerOrders, stats } = useMemo(() => {
        if (!selectedCustomer) return { customerOrders: [], stats: null };
        const orders = completedOrders.filter(o => o.customerId === selectedCustomer.id);
        const totalSpent = orders.reduce((sum, o) => sum + o.total, 0);
        const totalOrders = orders.length;
        const avgOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;
        return {
            customerOrders: orders,
            stats: { totalSpent, totalOrders, avgOrderValue }
        };
    }, [selectedCustomer, completedOrders]);

    const handleSave = (data: NewCustomerPayload | CustomerUpdatePayload, id?: number) => {
        if (id) {
            onUpdateCustomer(id, data);
        } else {
            onAddCustomer(data as NewCustomerPayload);
        }
        closeModal();
    };

    const openEditModal = (customer: Customer) => {
        setCustomerToEdit(customer);
        setModalOpen(true);
    };

    const openAddModal = () => {
        setCustomerToEdit(null);
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setCustomerToEdit(null);
    };
    
    const handleDelete = () => {
        if (customerToDelete) {
            onDeleteCustomer(customerToDelete.id);
            setCustomerToDelete(null);
            if (selectedCustomer?.id === customerToDelete.id) {
                setSelectedCustomer(null);
            }
        }
    };

    return (
        <div className="flex-grow flex flex-col md:flex-row overflow-hidden bg-gray-50 h-full">
            {/* Left Panel: Customer List */}
            <div className="w-full md:w-1/3 border-r border-gray-200 bg-white flex flex-col">
                <div className="p-4 border-b">
                    <input 
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder={t('adminPanel.customers.searchPlaceholder')}
                        className="w-full pl-4 pr-4 py-2 border border-gray-300 rounded-full"
                    />
                </div>
                <div className="flex-grow overflow-y-auto">
                    {filteredCustomers.length > 0 ? (
                        <ul className="divide-y divide-gray-200">
                           {filteredCustomers.map(c => (
                                <li key={c.id}>
                                    <button onClick={() => setSelectedCustomer(c)} className={`w-full text-left p-4 hover:bg-gray-50 focus:outline-none focus:bg-blue-50 ${selectedCustomer?.id === c.id ? 'bg-blue-50' : ''}`}>
                                        <p className="font-semibold text-gray-800">{c.name}</p>
                                        <p className="text-sm text-gray-500">{c.email}</p>
                                    </button>
                                </li>
                           ))}
                        </ul>
                    ) : (
                        <p className="text-center text-gray-500 p-8">{t('adminPanel.customers.noCustomers')}</p>
                    )}
                </div>
                <div className="p-4 border-t mt-auto">
                     <button onClick={openAddModal} className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md shadow-sm hover:bg-green-700">
                       {t('adminPanel.customers.addCustomer')}
                    </button>
                </div>
            </div>

            {/* Right Panel: Details */}
            <div className="w-full md:w-2/3 flex flex-col overflow-hidden">
                {selectedCustomer ? (
                    <>
                        <div className="p-4 border-b flex justify-between items-center bg-white">
                            <h3 className="text-lg font-semibold text-gray-800">{selectedCustomer.name}</h3>
                            <div>
                                <button onClick={() => openEditModal(selectedCustomer)} className="px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200">{t('adminPanel.customers.edit')}</button>
                                <button onClick={() => setCustomerToDelete(selectedCustomer)} className="ml-2 px-3 py-1.5 text-sm font-medium text-red-700 bg-red-100 rounded-md hover:bg-red-200">{t('adminPanel.customers.delete')}</button>
                            </div>
                        </div>
                        <div className="overflow-y-auto p-6">
                            {/* Stats */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                <StatCard title={t('adminPanel.dashboard.totalRevenue')} value={formatCurrency(stats?.totalSpent || 0)} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v.01" /></svg>} />
                                <StatCard title={t('adminPanel.dashboard.totalSales')} value={stats?.totalOrders || 0} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>} />
                                <StatCard title={t('adminPanel.dashboard.avgSale')} value={formatCurrency(stats?.avgOrderValue || 0)} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>} />
                            </div>
                             {/* Details Card */}
                            <div className="bg-white p-4 rounded-lg shadow-sm border mb-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                                    <div><strong className="text-gray-500 block">{t('adminPanel.customers.phone')}:</strong> {selectedCustomer.phone || 'N/A'}</div>
                                    <div><strong className="text-gray-500 block">{t('adminPanel.customers.email')}:</strong> {selectedCustomer.email || 'N/A'}</div>
                                    <div className="sm:col-span-2"><strong className="text-gray-500 block">{t('adminPanel.customers.address')}:</strong> {selectedCustomer.address || 'N/A'}</div>
                                    <div className="sm:col-span-2"><strong className="text-gray-500 block">{t('adminPanel.customers.notes')}:</strong> {selectedCustomer.notes || 'N/A'}</div>
                                    <div><strong className="text-gray-500 block">{t('adminPanel.customers.createdAt')}:</strong> {new Date(selectedCustomer.createdAt).toLocaleDateString()}</div>
                                </div>
                            </div>
                            {/* Purchase History */}
                            <div>
                                <h4 className="text-md font-semibold text-gray-700 mb-2">{t('adminPanel.suppliers.purchaseHistory')}</h4>
                                <div className="bg-white rounded-lg shadow-sm border overflow-x-auto">
                                    {customerOrders.length > 0 ? (
                                        <ul className="divide-y divide-gray-200">
                                            {customerOrders.map(order => (
                                                <li key={order.invoiceId}>
                                                    <button onClick={() => onViewReceipt(order)} className="w-full flex justify-between items-center p-3 text-sm hover:bg-gray-50">
                                                        <div>
                                                            <p className="font-semibold text-blue-600">{order.invoiceId}</p>
                                                            <p className="text-xs text-gray-500">{order.date}</p>
                                                        </div>
                                                        <p className="font-bold">{formatCurrency(order.total)}</p>
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className="text-center py-8 text-gray-500">{t('adminPanel.salesHistory.noSales')}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-grow flex items-center justify-center text-center text-gray-500">
                        <div>
                            <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                            <p className="mt-2 font-semibold">{t('adminPanel.suppliers.selectSupplierPrompt').replace('supplier', 'customer')}</p>
                        </div>
                    </div>
                )}
            </div>
            
            <CustomerModal 
                isOpen={isModalOpen}
                onClose={closeModal}
                onSave={handleSave}
                customerToEdit={customerToEdit}
            />

            <ConfirmationModal
                isOpen={!!customerToDelete}
                onClose={() => setCustomerToDelete(null)}
                onConfirm={handleDelete}
                title={t('adminPanel.customers.confirmDeleteTitle')}
                message={<p>{t('adminPanel.customers.confirmDeleteMessage')} <strong>{customerToDelete?.name}</strong>?</p>}
                confirmText={t('adminPanel.customers.delete')}
            />
        </div>
    );
};

export default CustomersTab;

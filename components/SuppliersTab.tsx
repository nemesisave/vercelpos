import React, { useState, useMemo } from 'react';
import type { Supplier, PurchaseOrder, Product, NewSupplierPayload, SupplierUpdatePayload, PurchaseOrderItem, PurchaseOrderStatus } from '../types';
import { useTranslations } from '../context/LanguageContext';
import { useCurrency } from '../context/CurrencyContext';
import AddSupplierModal from './AddSupplierModal';
import EditSupplierModal from './EditSupplierModal';
import CreatePurchaseOrderModal from './CreatePurchaseOrderModal';
import ReceiveStockModal from './ReceiveStockModal';


interface SuppliersTabProps {
    suppliers: Supplier[];
    products: Product[];
    purchaseOrders: PurchaseOrder[];
    onAddSupplier: (data: NewSupplierPayload) => void;
    onUpdateSupplier: (id: number, data: SupplierUpdatePayload) => void;
    onDeleteSupplier: (id: number) => void;
    onCreatePurchaseOrder: (orderData: { supplierId: number; supplierName: string; items: Omit<PurchaseOrderItem, 'quantityReceived'>[]; totalCost: number; }) => void;
    onReceiveStock: (purchaseOrderId: string, receivedQuantities: Record<number, number>) => void;
}

const StatusBadge: React.FC<{ status: PurchaseOrderStatus }> = ({ status }) => {
    const { t } = useTranslations();
    const statusStyles: Record<PurchaseOrderStatus, string> = {
        Ordered: 'bg-blue-100 text-blue-800',
        'Partially Received': 'bg-yellow-100 text-yellow-800',
        Received: 'bg-green-100 text-green-800',
        Cancelled: 'bg-red-100 text-red-800',
    };
    const textMap: Record<PurchaseOrderStatus, string> = {
        Ordered: t('adminPanel.suppliers.status_ordered'),
        'Partially Received': t('adminPanel.suppliers.status_partiallyReceived'),
        Received: t('adminPanel.suppliers.status_received'),
        Cancelled: t('adminPanel.suppliers.status_cancelled'),
    };
    return (
        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusStyles[status]}`}>
            {textMap[status]}
        </span>
    );
};

const SuppliersTab: React.FC<SuppliersTabProps> = ({
    suppliers,
    products,
    purchaseOrders,
    onAddSupplier,
    onUpdateSupplier,
    onDeleteSupplier,
    onCreatePurchaseOrder,
    onReceiveStock
}) => {
    const { t } = useTranslations();
    const { formatCurrency } = useCurrency();
    const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
    const [isAddModalOpen, setAddModalOpen] = useState(false);
    const [isEditModalOpen, setEditModalOpen] = useState(false);
    const [isPOModalOpen, setPOModalOpen] = useState(false);
    const [isReceiveModalOpen, setReceiveModalOpen] = useState(false);
    const [poToReceive, setPoToReceive] = useState<PurchaseOrder | null>(null);

    const supplierPurchaseOrders = useMemo(() => {
        if (!selectedSupplier) return [];
        return purchaseOrders.filter(po => po.supplierId === selectedSupplier.id);
    }, [selectedSupplier, purchaseOrders]);

    const handleEditClick = (supplier: Supplier) => {
        setSelectedSupplier(supplier);
        setEditModalOpen(true);
    };

    const handleReceiveClick = (po: PurchaseOrder) => {
        setPoToReceive(po);
        setReceiveModalOpen(true);
    };

    return (
        <div className="flex-grow flex flex-col md:flex-row overflow-hidden bg-gray-50 h-full">
             {/* Left Panel: Supplier List */}
            <div className="w-full md:w-1/3 border-r border-gray-200 bg-white flex flex-col">
                 <div className="p-4 border-b">
                    <h3 className="text-lg font-semibold text-gray-800">{t('adminPanel.suppliers.title')}</h3>
                </div>
                 <div className="flex-grow overflow-y-auto">
                    {suppliers.length > 0 ? (
                        <ul className="divide-y divide-gray-200">
                           {suppliers.map(s => (
                                <li key={s.id}>
                                    <button onClick={() => setSelectedSupplier(s)} className={`w-full text-left p-4 hover:bg-gray-50 focus:outline-none focus:bg-blue-50 ${selectedSupplier?.id === s.id ? 'bg-blue-50' : ''}`}>
                                        <p className="font-semibold text-gray-800">{s.name}</p>
                                        <p className="text-sm text-gray-500">{s.contactPerson}</p>
                                    </button>
                                </li>
                           ))}
                        </ul>
                    ) : (
                        <p className="text-center text-gray-500 p-8">{t('adminPanel.suppliers.noSuppliers')}</p>
                    )}
                </div>
                <div className="p-4 border-t mt-auto flex space-x-2">
                     <button onClick={() => setAddModalOpen(true)} className="flex-1 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md shadow-sm hover:bg-green-700">
                       {t('adminPanel.suppliers.addSupplier')}
                    </button>
                    <button onClick={() => setPOModalOpen(true)} className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md shadow-sm hover:bg-blue-700">
                        {t('adminPanel.suppliers.createPO')}
                    </button>
                </div>
            </div>

            {/* Right Panel: Details and POs */}
            <div className="w-full md:w-2/3 flex flex-col overflow-hidden">
                {selectedSupplier ? (
                    <>
                        <div className="p-4 border-b flex justify-between items-center bg-white">
                            <h3 className="text-lg font-semibold text-gray-800">{t('adminPanel.suppliers.supplierDetails')}</h3>
                            <div>
                                <button onClick={() => handleEditClick(selectedSupplier)} className="px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200">{t('adminPanel.suppliers.edit')}</button>
                                <button onClick={() => onDeleteSupplier(selectedSupplier.id)} className="ml-2 px-3 py-1.5 text-sm font-medium text-red-700 bg-red-100 rounded-md hover:bg-red-200">{t('adminPanel.suppliers.delete')}</button>
                            </div>
                        </div>
                        <div className="overflow-y-auto p-6">
                             {/* Details Card */}
                            <div className="bg-white p-4 rounded-lg shadow-sm border mb-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                                    <div><strong className="text-gray-500 block">{t('adminPanel.suppliers.name')}:</strong> {selectedSupplier.name}</div>
                                    <div><strong className="text-gray-500 block">{t('adminPanel.suppliers.contact')}:</strong> {selectedSupplier.contactPerson}</div>
                                    <div><strong className="text-gray-500 block">{t('adminPanel.suppliers.phone')}:</strong> {selectedSupplier.phone || 'N/A'}</div>
                                    <div><strong className="text-gray-500 block">{t('adminPanel.suppliers.email')}:</strong> {selectedSupplier.email || 'N/A'}</div>
                                    <div className="sm:col-span-2"><strong className="text-gray-500 block">{t('adminPanel.suppliers.address')}:</strong> {selectedSupplier.address || 'N/A'}</div>
                                    <div className="sm:col-span-2"><strong className="text-gray-500 block">{t('adminPanel.suppliers.notes')}:</strong> {selectedSupplier.notes || 'N/A'}</div>
                                </div>
                            </div>
                            {/* PO History */}
                            <div>
                                <h4 className="text-md font-semibold text-gray-700 mb-2">{t('adminPanel.suppliers.purchaseHistory')}</h4>
                                <div className="bg-white rounded-lg shadow-sm border overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">{t('adminPanel.suppliers.poNumber')}</th>
                                                <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">{t('adminPanel.suppliers.date')}</th>
                                                <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">{t('adminPanel.suppliers.total')}</th>
                                                <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">{t('adminPanel.suppliers.status')}</th>
                                                <th className="relative px-4 py-2"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {supplierPurchaseOrders.length > 0 ? supplierPurchaseOrders.map(po => (
                                                <tr key={po.id}>
                                                    <td className="px-4 py-3 whitespace-nowrap font-medium text-blue-600">{po.id}</td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-gray-500">{po.date}</td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-gray-900 font-semibold">{formatCurrency(po.totalCost)}</td>
                                                    <td className="px-4 py-3 whitespace-nowrap"><StatusBadge status={po.status} /></td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-right font-medium">
                                                        {(po.status === 'Ordered' || po.status === 'Partially Received') && (
                                                            <button onClick={() => handleReceiveClick(po)} className="text-green-600 hover:text-green-900">{t('adminPanel.suppliers.receiveStock')}</button>
                                                        )}
                                                    </td>
                                                </tr>
                                            )) : (
                                                <tr><td colSpan={5} className="text-center py-8 text-gray-500">{t('adminPanel.suppliers.noPOs')}</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex-grow flex items-center justify-center text-center text-gray-500">
                        <div>
                            <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                            <p className="mt-2 font-semibold">{t('adminPanel.suppliers.selectSupplierPrompt')}</p>
                        </div>
                    </div>
                )}
            </div>
            
            <AddSupplierModal 
                isOpen={isAddModalOpen}
                onClose={() => setAddModalOpen(false)}
                onAddSupplier={onAddSupplier}
            />
            {selectedSupplier && (
                <EditSupplierModal
                    isOpen={isEditModalOpen}
                    onClose={() => setEditModalOpen(false)}
                    supplierToEdit={selectedSupplier}
                    onUpdateSupplier={onUpdateSupplier}
                />
            )}
            <CreatePurchaseOrderModal
                isOpen={isPOModalOpen}
                onClose={() => setPOModalOpen(false)}
                suppliers={suppliers}
                products={products}
                onCreatePurchaseOrder={onCreatePurchaseOrder}
            />
            {poToReceive && (
                 <ReceiveStockModal
                    isOpen={isReceiveModalOpen}
                    onClose={() => { setReceiveModalOpen(false); setPoToReceive(null); }}
                    purchaseOrder={poToReceive}
                    onConfirmReceive={onReceiveStock}
                />
            )}
        </div>
    );
};

export default SuppliersTab;
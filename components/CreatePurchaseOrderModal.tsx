import React, { useState, useMemo } from 'react';
import type { Supplier, Product, PurchaseOrderItem } from '../types';
import { useTranslations } from '../context/LanguageContext';
import { useCurrency } from '../context/CurrencyContext';

interface CreatePurchaseOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  suppliers: Supplier[];
  products: Product[];
  onCreatePurchaseOrder: (orderData: { supplierId: number; supplierName: string; items: Omit<PurchaseOrderItem, 'quantityReceived'>[]; totalCost: number; }) => void;
}

type POItem = Omit<PurchaseOrderItem, 'quantityReceived'>;

const CreatePurchaseOrderModal: React.FC<CreatePurchaseOrderModalProps> = ({
  isOpen,
  onClose,
  suppliers,
  products,
  onCreatePurchaseOrder
}) => {
  const { t } = useTranslations();
  const { formatCurrency, baseCurrencyCode } = useCurrency();
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [items, setItems] = useState<POItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProducts = useMemo(() => {
    if (!searchQuery) return [];
    return products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [searchQuery, products]);
  
  const grandTotal = useMemo(() => {
    return items.reduce((sum, item) => sum + item.costPrice * item.quantity, 0);
  }, [items]);

  const handleAddProduct = (product: Product) => {
    if (items.some(item => item.productId === product.id)) return; // Avoid duplicates
    setItems(prev => [...prev, {
        productId: product.id,
        productName: product.name,
        quantity: 1,
        costPrice: product.purchasePrice[baseCurrencyCode] || 0
    }]);
    setSearchQuery('');
  };

  const handleUpdateItem = (productId: number, field: 'quantity' | 'costPrice', value: number) => {
    if (value < 0) return;
    setItems(prev => prev.map(item => 
        item.productId === productId ? { ...item, [field]: value } : item
    ));
  };
  
  const handleRemoveItem = (productId: number) => {
    setItems(prev => prev.filter(item => item.productId !== productId));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierId) {
        alert(t('createPOModal.errorNoSupplier'));
        return;
    }
    if (items.length === 0) {
        alert(t('createPOModal.errorNoItems'));
        return;
    }

    const supplier = suppliers.find(s => s.id === parseInt(selectedSupplierId));
    if (!supplier) return;

    onCreatePurchaseOrder({
        supplierId: supplier.id,
        supplierName: supplier.name,
        items: items,
        totalCost: grandTotal
    });

    // Reset and close
    setSelectedSupplierId('');
    setItems([]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[60] p-4">
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-xl w-full max-w-3xl flex flex-col h-[90vh]">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold text-gray-800">{t('createPOModal.title')}</h2>
        </div>
        
        <div className="p-6 flex-grow overflow-y-auto space-y-6">
          {/* Supplier and Product Search */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
                <label htmlFor="supplier-select" className="block text-sm font-medium text-gray-700">{t('createPOModal.selectSupplier')}</label>
                <select id="supplier-select" value={selectedSupplierId} onChange={e => setSelectedSupplierId(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md" required>
                    <option value="" disabled>-- {t('createPOModal.selectSupplier')} --</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
            </div>
            <div className="relative">
                <label htmlFor="product-search" className="block text-sm font-medium text-gray-700">{t('createPOModal.searchProduct')}</label>
                <input type="text" id="product-search" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                {searchQuery && filteredProducts.length > 0 && (
                    <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-md mt-1 max-h-40 overflow-y-auto shadow-lg">
                        {filteredProducts.map(p => (
                            <li key={p.id} onClick={() => handleAddProduct(p)} className="px-4 py-2 cursor-pointer hover:bg-gray-100">
                                {p.name}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
          </div>
          
          {/* Items Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('createPOModal.product')}</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('createPOModal.quantity')}</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('createPOModal.costPrice')} ({baseCurrencyCode})</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('createPOModal.lineTotal')}</th>
                        <th className="relative px-4 py-2"></th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {items.length > 0 ? items.map(item => (
                        <tr key={item.productId}>
                            <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{item.productName}</td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm">
                                <input type="number" value={item.quantity} onChange={e => handleUpdateItem(item.productId, 'quantity', parseInt(e.target.value) || 0)} className="w-20 border-gray-300 rounded-md shadow-sm" />
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm">
                                <input type="number" step="0.01" value={item.costPrice} onChange={e => handleUpdateItem(item.productId, 'costPrice', parseFloat(e.target.value) || 0)} className="w-24 border-gray-300 rounded-md shadow-sm" />
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">{formatCurrency(item.quantity * item.costPrice)}</td>
                            <td className="px-4 py-2 whitespace-nowrap text-right">
                                <button type="button" onClick={() => handleRemoveItem(item.productId)} className="text-red-600 hover:text-red-800">
                                   <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                            </td>
                        </tr>
                    )) : (
                        <tr><td colSpan={5} className="text-center py-6 text-gray-500">{t('createPOModal.noProducts')}</td></tr>
                    )}
                </tbody>
            </table>
          </div>
        </div>

        <div className="p-4 bg-gray-50 flex justify-between items-center mt-auto border-t">
            <div className="text-lg font-bold">
                {t('createPOModal.grandTotal')}: <span className="text-blue-600">{formatCurrency(grandTotal)}</span>
            </div>
            <div className="space-x-3">
                <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50">{t('createPOModal.cancel')}</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700">{t('createPOModal.submit')}</button>
            </div>
        </div>
      </form>
    </div>
  );
};

export default CreatePurchaseOrderModal;
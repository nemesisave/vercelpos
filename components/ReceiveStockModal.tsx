import React, { useState, useMemo } from 'react';
import type { PurchaseOrder } from '../types';
import { useTranslations } from '../context/LanguageContext';
import { useCurrency } from '../context/CurrencyContext';

interface ReceiveStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchaseOrder: PurchaseOrder;
  onConfirmReceive: (purchaseOrderId: string, receivedQuantities: Record<number, number>) => void;
}

const ReceiveStockModal: React.FC<ReceiveStockModalProps> = ({
  isOpen,
  onClose,
  purchaseOrder,
  onConfirmReceive
}) => {
    const { t } = useTranslations();
    const [quantities, setQuantities] = useState<Record<number, string>>({});

    const handleQuantityChange = (productId: number, value: string) => {
        const item = purchaseOrder.items.find(i => i.productId === productId);
        if (!item) return;
        const maxReceivable = item.quantity - item.quantityReceived;
        const numValue = parseInt(value, 10);

        if (value === '' || (numValue >= 0 && numValue <= maxReceivable)) {
            setQuantities(prev => ({ ...prev, [productId]: value }));
        }
    };

    const handleSubmit = () => {
        const receivedQuantities: Record<number, number> = {};
        let totalReceived = 0;
        for (const productId in quantities) {
            const quantity = parseInt(quantities[productId], 10);
            if (!isNaN(quantity) && quantity > 0) {
                receivedQuantities[productId] = quantity;
                totalReceived += quantity;
            }
        }

        if (totalReceived === 0) {
            alert(t('receiveStockModal.nothingToReceive'));
            return;
        }

        onConfirmReceive(purchaseOrder.id, receivedQuantities);
        alert(t('receiveStockModal.receptionSuccess'));
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[70] p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl flex flex-col h-[80vh]">
                <div className="p-6 border-b">
                    <h2 className="text-xl font-bold text-gray-800">{t('receiveStockModal.title')} #{purchaseOrder.id}</h2>
                </div>
                <div className="flex-grow overflow-y-auto p-6">
                    <div className="bg-white rounded-lg border">
                        {/* Header */}
                        <div className="grid grid-cols-5 gap-4 p-4 font-semibold text-xs text-gray-600 border-b bg-gray-50">
                            <div className="col-span-2">{t('receiveStockModal.product')}</div>
                            <div className="text-center">{t('receiveStockModal.ordered')}</div>
                            <div className="text-center">{t('receiveStockModal.received')}</div>
                            <div className="text-center">{t('receiveStockModal.toReceive')}</div>
                        </div>
                        {/* Body */}
                        <div className="divide-y">
                            {purchaseOrder.items.map(item => {
                                const remaining = item.quantity - item.quantityReceived;
                                return (
                                <div key={item.productId} className="grid grid-cols-5 gap-4 p-4 items-center">
                                    <div className="col-span-2 font-medium text-gray-800 text-sm">{item.productName}</div>
                                    <div className="text-center text-gray-700 font-medium">{item.quantity}</div>
                                    <div className="text-center text-green-600 font-medium">{item.quantityReceived}</div>
                                    <div className="text-center">
                                        <input
                                            type="number"
                                            value={quantities[item.productId] || ''}
                                            onChange={(e) => handleQuantityChange(item.productId, e.target.value)}
                                            className="w-24 text-center border border-gray-300 rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                                            placeholder="0"
                                            min="0"
                                            max={remaining}
                                            disabled={remaining === 0}
                                        />
                                    </div>
                                </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
                <div className="p-4 bg-gray-50 flex justify-end space-x-3 mt-auto border-t">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50">{t('receiveStockModal.cancel')}</button>
                    <button type="button" onClick={handleSubmit} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700">{t('receiveStockModal.confirm')}</button>
                </div>
            </div>
        </div>
    );
};

export default ReceiveStockModal;
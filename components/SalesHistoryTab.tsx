import React, { useState, useMemo } from 'react';
import type { CompletedOrder, User, RefundTransaction, OrderStatus, PaymentMethod } from '../types';
import { useTranslations } from '../context/LanguageContext';
import { useCurrency } from '../context/CurrencyContext';
import RefundModal from './RefundModal';

interface SalesHistoryTabProps {
  orders: CompletedOrder[];
  users: User[];
  refundTransactions: RefundTransaction[];
  onViewReceipt: (order: CompletedOrder) => void;
  onProcessRefund: (originalInvoiceId: string, itemsToRefund: { id: number; quantity: number }[], restock: boolean) => void;
}

const StatusBadge: React.FC<{ status: OrderStatus }> = ({ status }) => {
    const { t } = useTranslations();
    const statusStyles: Record<OrderStatus, string> = {
        'Completed': 'bg-green-100 text-green-800',
        'Partially Refunded': 'bg-yellow-100 text-yellow-800',
        'Fully Refunded': 'bg-red-100 text-red-800',
    };
    const textMap: Record<OrderStatus, string> = {
        'Completed': t('adminPanel.salesHistory.status_Completed'),
        'Partially Refunded': t('adminPanel.salesHistory.status_PartiallyRefunded'),
        'Fully Refunded': t('adminPanel.salesHistory.status_FullyRefunded'),
    };
    return <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusStyles[status]}`}>{textMap[status]}</span>;
};

const OrderDetails: React.FC<{
    order: CompletedOrder;
    onViewReceipt: (order: CompletedOrder) => void;
    onOpenRefundModal: () => void;
}> = ({ order, onViewReceipt, onOpenRefundModal }) => {
    const { t } = useTranslations();
    const { formatCurrency, baseCurrencyCode } = useCurrency();
    return (
        <div className="p-6 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800">{t('adminPanel.salesHistory.transactionDetails')}</h3>
                <div>
                     {order.status !== 'Fully Refunded' && (
                        <button onClick={onOpenRefundModal} className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 mr-2">
                          {t('adminPanel.salesHistory.processRefund')}
                        </button>
                    )}
                    <button onClick={() => onViewReceipt(order)} className="px-3 py-1.5 text-sm font-medium text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200">
                        {t('receiptModal.title')}
                    </button>
                </div>
            </div>
            {/* Details Card */}
            <div className="bg-white p-4 rounded-lg shadow-sm border mb-6">
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><strong>{t('receiptModal.invoiceId')}:</strong> {order.invoiceId}</div>
                    <div><strong>{t('receiptModal.date')}:</strong> {order.date}</div>
                    <div><strong>{t('receiptModal.cashier')}:</strong> {order.cashier}</div>
                    <div><strong>{t('receiptModal.paymentMethod')}:</strong> <span className="capitalize">{t(`checkoutModal.${order.paymentMethod}`)}</span></div>
                    <div><strong>{t('adminPanel.suppliers.status')}:</strong> <StatusBadge status={order.status} /></div>
                    {order.customerName && <div><strong>{t('orderSummary.customer')}:</strong> {order.customerName}</div>}
                    {order.refundAmount && order.refundAmount > 0 && 
                        <div className="font-semibold text-red-600"><strong>{t('adminPanel.salesHistory.refundedAmount')}:</strong> {formatCurrency(order.refundAmount)}</div>
                    }
                </div>
            </div>
            {/* Items List */}
            <div className="bg-white rounded-lg shadow-sm border">
                <ul className="divide-y divide-gray-200">
                    {order.items.map(item => (
                        <li key={item.id} className="flex p-3 items-center">
                            <img src={item.imageUrl} alt={item.name} className="w-10 h-10 rounded-md object-cover mr-4" />
                            <div className="flex-grow">
                                <p className="font-semibold text-sm">{item.name}</p>
                                <p className="text-xs text-gray-500">{item.quantity} x {formatCurrency(item.price[baseCurrencyCode] || 0)}</p>
                            </div>
                            <p className="font-semibold text-sm">{formatCurrency((item.price[baseCurrencyCode] || 0) * item.quantity)}</p>
                        </li>
                    ))}
                </ul>
                <div className="p-4 bg-gray-50 text-sm space-y-1">
                     <div className="flex justify-between"><span>{t('receiptModal.subtotal')}:</span><span>{formatCurrency(order.subtotal)}</span></div>
                     <div className="flex justify-between"><span>{t('receiptModal.tax')}:</span><span>{formatCurrency(order.tax)}</span></div>
                     <div className="flex justify-between font-bold text-base mt-2 pt-2 border-t"><span>{t('receiptModal.total')}:</span><span>{formatCurrency(order.total)}</span></div>
                </div>
            </div>
        </div>
    );
}

const SalesHistoryTab: React.FC<SalesHistoryTabProps> = ({ orders, users, refundTransactions, onViewReceipt, onProcessRefund }) => {
    const { t } = useTranslations();
    const { formatCurrency } = useCurrency();
    const [selectedOrder, setSelectedOrder] = useState<CompletedOrder | null>(null);
    const [isRefundModalOpen, setRefundModalOpen] = useState(false);
    
    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [cashierFilter, setCashierFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
    const [paymentFilter, setPaymentFilter] = useState<'all' | PaymentMethod>('all');

    const filteredOrders = useMemo(() => {
        return orders.filter(order => {
            if (searchQuery && !order.invoiceId.toLowerCase().includes(searchQuery.toLowerCase()) && !(order.customerName || '').toLowerCase().includes(searchQuery.toLowerCase())) {
                return false;
            }
            if (cashierFilter !== 'all' && order.cashier !== cashierFilter) {
                return false;
            }
            if (statusFilter !== 'all' && order.status !== statusFilter) {
                return false;
            }
            if (paymentFilter !== 'all' && order.paymentMethod !== paymentFilter) {
                return false;
            }
            return true;
        });
    }, [orders, searchQuery, cashierFilter, statusFilter, paymentFilter]);
    
    return (
        <div className="flex-grow flex flex-col md:flex-row overflow-hidden bg-gray-50 h-full">
            {/* Left Panel: Transaction List */}
            <div className="w-full md:w-2/5 xl:w-1/3 border-r border-gray-200 bg-white flex flex-col">
                <div className="p-4 border-b">
                    <h3 className="text-lg font-semibold text-gray-800">{t('adminPanel.salesHistory.transactionList')}</h3>
                    <input type="text" placeholder={t('adminPanel.salesHistory.searchPlaceholder')} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full mt-2 px-3 py-1.5 text-sm border border-gray-300 rounded-full" />
                    <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                        <select value={cashierFilter} onChange={e => setCashierFilter(e.target.value)} className="w-full border-gray-300 rounded-md shadow-sm text-xs p-1">
                            <option value="all">{t('adminPanel.salesHistory.all')} {t('receiptModal.cashier')}s</option>
                            {[...new Set(users.map(u => u.name))].map(name => <option key={name} value={name}>{name}</option>)}
                        </select>
                        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} className="w-full border-gray-300 rounded-md shadow-sm text-xs p-1">
                            <option value="all">{t('adminPanel.salesHistory.all')} {t('adminPanel.suppliers.status')}es</option>
                            <option value="Completed">{t('adminPanel.salesHistory.status_Completed')}</option>
                            <option value="Partially Refunded">{t('adminPanel.salesHistory.status_PartiallyRefunded')}</option>
                            <option value="Fully Refunded">{t('adminPanel.salesHistory.status_FullyRefunded')}</option>
                        </select>
                        <select value={paymentFilter} onChange={e => setPaymentFilter(e.target.value as any)} className="w-full border-gray-300 rounded-md shadow-sm text-xs p-1">
                            <option value="all">{t('adminPanel.salesHistory.all')} Payments</option>
                            <option value="cash">{t('checkoutModal.cash')}</option>
                            <option value="card">{t('checkoutModal.card')}</option>
                        </select>
                    </div>
                </div>
                <div className="flex-grow overflow-y-auto">
                    {filteredOrders.length > 0 ? (
                        <ul className="divide-y divide-gray-200">
                            {filteredOrders.map(order => (
                                <li key={order.invoiceId}>
                                    <button onClick={() => setSelectedOrder(order)} className={`w-full text-left p-3 hover:bg-gray-50 focus:outline-none focus:bg-blue-50 ${selectedOrder?.invoiceId === order.invoiceId ? 'bg-blue-50' : ''}`}>
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className="font-semibold text-blue-600 text-sm">{order.invoiceId}</p>
                                                <p className="text-xs text-gray-500">{order.date} {order.customerName && `• ${order.customerName}`}</p>
                                            </div>
                                            <div className="text-right">
                                                 <p className="font-bold text-gray-800">{formatCurrency(order.total)}</p>
                                                 <StatusBadge status={order.status} />
                                            </div>
                                        </div>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-center text-gray-500 p-8">{t('adminPanel.salesHistory.noSales')}</p>
                    )}
                </div>
            </div>

            {/* Right Panel: Details */}
            <div className="w-full md:w-3/5 xl:w-2/3 flex flex-col overflow-hidden">
                {selectedOrder ? (
                    <OrderDetails 
                        order={selectedOrder} 
                        onViewReceipt={onViewReceipt} 
                        onOpenRefundModal={() => setRefundModalOpen(true)}
                    />
                ) : (
                    <div className="flex-grow flex items-center justify-center text-center text-gray-500">
                         <div>
                            <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            <p className="mt-2 font-semibold">{t('adminPanel.salesHistory.selectTransactionPrompt')}</p>
                        </div>
                    </div>
                )}
            </div>

            {selectedOrder && (
                <RefundModal
                    isOpen={isRefundModalOpen}
                    onClose={() => setRefundModalOpen(false)}
                    order={selectedOrder}
                    onProcessRefund={onProcessRefund}
                    refundTransactions={refundTransactions}
                />
            )}
        </div>
    );
};

export default SalesHistoryTab;
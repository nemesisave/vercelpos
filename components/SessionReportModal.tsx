import React, { useMemo } from 'react';
import type { CashDrawerSession } from '../types';
import { useTranslations } from '../context/LanguageContext';
import { useCurrency } from '../context/CurrencyContext';

interface SessionReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: CashDrawerSession;
}

const SessionReportModal: React.FC<SessionReportModalProps> = ({ isOpen, onClose, session }) => {
  const { t } = useTranslations();
  const { formatCurrency } = useCurrency();

  const reportData = useMemo(() => {
    const cashSales = session.activities.filter(a => a.type === 'sale' && a.paymentMethod === 'cash').reduce((s, a) => s + a.amount, 0);
    const cardSales = session.activities.filter(a => a.type === 'sale' && a.paymentMethod === 'card').reduce((s, a) => s + a.amount, 0);
    const payIns = session.activities.filter(a => a.type === 'pay-in').reduce((s, a) => s + a.amount, 0);
    const payOuts = session.activities.filter(a => a.type === 'pay-out').reduce((s, a) => s + a.amount, 0);
    
    const totalNetSales = cashSales + cardSales;
    const subtotalCash = session.startingCash + cashSales + payIns;
    const expectedCash = subtotalCash - payOuts;

    return { cashSales, cardSales, payIns, payOuts, totalNetSales, subtotalCash, expectedCash };
  }, [session]);
  
  if (!isOpen) return null;

  const handlePrint = () => {
    // This is a simplified print. More robust solution would use a dedicated library or more complex CSS.
    const printableContent = document.querySelector('.printable-session-report');
    if (printableContent) {
        const printWindow = window.open('', '', 'height=600,width=800');
        printWindow?.document.write('<html><head><title>Session Report</title>');
        printWindow?.document.write('<style>body { font-family: monospace; } table { width: 100%; border-collapse: collapse; } th, td { border: 1px solid #ddd; padding: 8px; text-align: left; } .right { text-align: right; } .header { text-align: center; margin-bottom: 20px; } .section-title { font-weight: bold; margin-top: 20px; border-bottom: 1px solid #000; } .total { font-weight: bold; } </style>');
        printWindow?.document.write('</head><body>');
        printWindow?.document.write(printableContent.innerHTML);
        printWindow?.document.write('</body></html>');
        printWindow?.document.close();
        printWindow?.print();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-[70] p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="p-4 border-b flex justify-between items-center print-hidden">
          <h2 className="text-xl font-bold text-gray-800">{t('sessionReportModal.title')}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-3xl leading-none">&times;</button>
        </div>
        
        <div className="p-6 overflow-y-auto printable-session-report">
          {/* Session Details */}
          <div className="border-b pb-4">
            <h3 className="font-bold text-lg mb-2">{t('sessionReportModal.sessionDetails')}</h3>
            <div className="grid grid-cols-2 gap-x-4 text-sm">
              <p><strong>{t('sessionReportModal.sessionId')}:</strong> {session.id}</p>
              <p><strong>{t('sessionReportModal.openedBy')}:</strong> {session.openedBy}</p>
              <p><strong>{t('sessionReportModal.closedBy')}:</strong> {session.closedBy}</p>
              <p><strong>{t('sessionReportModal.period')}:</strong> {session.openedAt} - {session.closedAt}</p>
            </div>
          </div>
          
          {/* Sales Summary */}
          <div className="mt-4 border-b pb-4">
            <h3 className="font-bold text-lg mb-2">{t('sessionReportModal.salesSummary')}</h3>
            <div className="space-y-1 text-sm">
              <p className="flex justify-between"><span>{t('sessionReportModal.cash')}:</span> <span>{formatCurrency(reportData.cashSales)}</span></p>
              <p className="flex justify-between"><span>{t('sessionReportModal.card')}:</span> <span>{formatCurrency(reportData.cardSales)}</span></p>
              <p className="flex justify-between font-bold text-base mt-2 pt-2 border-t"><span>{t('sessionReportModal.totalNetSales')}:</span> <span>{formatCurrency(reportData.totalNetSales)}</span></p>
            </div>
          </div>

          {/* Cash Flow */}
          <div className="mt-4 border-b pb-4">
            <h3 className="font-bold text-lg mb-2">{t('sessionReportModal.cashFlow')}</h3>
             <div className="space-y-1 text-sm">
              <p className="flex justify-between"><span>{t('sessionReportModal.startingCash')}:</span> <span>{formatCurrency(session.startingCash)}</span></p>
              <p className="flex justify-between"><span>+ {t('sessionReportModal.cashSales')}:</span> <span>{formatCurrency(reportData.cashSales)}</span></p>
              <p className="flex justify-between text-green-600"><span>+ {t('sessionReportModal.payIns')}:</span> <span>{formatCurrency(reportData.payIns)}</span></p>
              <p className="flex justify-between font-semibold mt-1 pt-1 border-t"><span>= {t('sessionReportModal.subtotal')}:</span> <span>{formatCurrency(reportData.subtotalCash)}</span></p>
              <p className="flex justify-between text-red-600"><span>- {t('sessionReportModal.payOuts')}:</span> <span>{formatCurrency(reportData.payOuts)}</span></p>
              <p className="flex justify-between font-bold text-base mt-2 pt-2 border-t"><span>= {t('sessionReportModal.expectedCash')}:</span> <span>{formatCurrency(reportData.expectedCash)}</span></p>
            </div>
          </div>
          
          {/* Final Count */}
          <div className="mt-4">
             <h3 className="font-bold text-lg mb-2">{t('sessionReportModal.finalCount')}</h3>
             <div className="space-y-1 text-sm">
                 <p className="flex justify-between"><span>{t('sessionReportModal.countedCash')}:</span> <span className="font-semibold">{formatCurrency(session.closingCash || 0)}</span></p>
                 <p className="flex justify-between"><span>- {t('sessionReportModal.expectedCash')}:</span> <span>{formatCurrency(reportData.expectedCash)}</span></p>
                 <div className={`flex justify-between font-bold text-base mt-2 pt-2 border-t ${(session.difference || 0) !== 0 ? 'text-red-600' : 'text-green-600'}`}>
                    <span>= {t('sessionReportModal.difference')}:</span>
                    <span>
                        {formatCurrency(session.difference || 0)}
                        {(session.difference || 0) > 0 ? ` (${t('sessionReportModal.over')})` : ''}
                        {(session.difference || 0) < 0 ? ` (${t('sessionReportModal.short')})` : ''}
                    </span>
                 </div>
             </div>
          </div>
        </div>
        
        <div className="p-4 bg-gray-50 flex justify-end space-x-3 mt-auto print-hidden">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50">{t('sessionReportModal.close')}</button>
          <button type="button" onClick={handlePrint} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700">{t('sessionReportModal.print')}</button>
        </div>
      </div>
    </div>
  );
};

export default SessionReportModal;
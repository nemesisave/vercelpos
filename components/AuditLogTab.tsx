import React, { useState, useMemo } from 'react';
import type { AuditLog, User } from '../types';
import { useTranslations } from '../context/LanguageContext';

interface AuditLogTabProps {
  auditLogs: AuditLog[];
  users: User[];
}

const ActionBadge: React.FC<{ action: string }> = ({ action }) => {
  const { t } = useTranslations();
  const translationKey = `auditLog.actions.${action}`;
  const translatedAction = t(translationKey);
  const displayText = translatedAction === translationKey ? action.replace(/_/g, ' ') : translatedAction;

  let colorClasses = 'bg-gray-100 text-gray-800'; // Default
  if (action.startsWith('ADD_') || action.startsWith('CREATE_') || action.startsWith('OPEN_')) {
    colorClasses = 'bg-green-100 text-green-800';
  } else if (action.startsWith('UPDATE_') || action.startsWith('RECEIVE_')) {
    colorClasses = 'bg-blue-100 text-blue-800';
  } else if (action.startsWith('DELETE_') || action.startsWith('CLOSE_')) {
    colorClasses = 'bg-red-100 text-red-800';
  } else if (action.includes('PAYMENT') || action.includes('REFUND')) {
    colorClasses = 'bg-purple-100 text-purple-800';
  } else if (action.includes('CASH')) {
    colorClasses = 'bg-yellow-100 text-yellow-800';
  }

  return (
    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${colorClasses}`}>
      {displayText}
    </span>
  );
};


const AuditLogTab: React.FC<AuditLogTabProps> = ({ auditLogs, users }) => {
  const { t } = useTranslations();
  const [userFilter, setUserFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');

  const filteredLogs = useMemo(() => {
    let logs = [...auditLogs];

    if (userFilter !== 'all') {
      logs = logs.filter(log => log.user_id === parseInt(userFilter));
    }

    if (dateFilter !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      logs = logs.filter(log => {
        const logDate = new Date(log.created_at);
        switch(dateFilter) {
          case 'today':
            return logDate >= today;
          case 'yesterday':
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            return logDate >= yesterday && logDate < today;
          case 'last7days':
            const last7days = new Date(today);
            last7days.setDate(last7days.getDate() - 6);
            return logDate >= last7days;
          default:
            return true;
        }
      });
    }

    return logs;
  }, [auditLogs, userFilter, dateFilter]);

  return (
    <div className="flex-grow flex flex-col p-6 overflow-hidden bg-gray-50">
      <div className="mb-4">
        <h3 className="text-xl font-bold text-gray-800">{t('auditLog.title')}</h3>
        <p className="text-sm text-gray-500">{t('auditLog.description')}</p>
      </div>
      
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-4 p-4 bg-white rounded-lg shadow-sm border">
        <div className="flex-1">
          <label htmlFor="user-filter" className="block text-sm font-medium text-gray-700">{t('auditLog.filterByUser')}</label>
          <select id="user-filter" value={userFilter} onChange={e => setUserFilter(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md">
            <option value="all">{t('auditLog.allUsers')}</option>
            {users.map(user => <option key={user.id} value={user.id}>{user.name}</option>)}
          </select>
        </div>
        <div className="flex-1">
          <label htmlFor="date-filter" className="block text-sm font-medium text-gray-700">{t('auditLog.filterByDate')}</label>
          <select id="date-filter" value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md">
            <option value="all">{t('auditLog.allTime')}</option>
            <option value="today">{t('adminPanel.salesHistory.today')}</option>
            <option value="yesterday">{t('adminPanel.salesHistory.yesterday')}</option>
            <option value="last7days">{t('adminPanel.salesHistory.last7days')}</option>
          </select>
        </div>
      </div>

      {/* Log Table */}
      <div className="flex-grow overflow-y-auto bg-white rounded-lg shadow-sm border">
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                    <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('auditLog.timestamp')}</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('auditLog.user')}</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('auditLog.action')}</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('auditLog.details')}</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {filteredLogs.map(log => (
                        <tr key={log.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(log.created_at).toLocaleString()}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{log.user_name}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                              <ActionBadge action={log.action} />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 truncate max-w-sm" title={log.details}>{log.details}</td>
                        </tr>
                    ))}
                     {filteredLogs.length === 0 && (
                        <tr>
                            <td colSpan={4} className="text-center py-10 text-gray-500">
                                {t('auditLog.noLogsFound')}
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};

export default AuditLogTab;

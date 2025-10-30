import React, { useState } from 'react';
import type { Permission, Role } from '../types';
import { useTranslations } from '../context/LanguageContext';
import { ALL_PERMISSIONS, PERMISSION_GROUPS } from '../constants';

interface AddRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddRole: (newRole: Omit<Role, 'descriptionKey'>) => void;
}

const AddRoleModal: React.FC<AddRoleModalProps> = ({ isOpen, onClose, onAddRole }) => {
  const [name, setName] = useState('');
  const [permissions, setPermissions] = useState<Set<Permission>>(new Set());
  const { t } = useTranslations();
  
  if (!isOpen) return null;

  const handlePermissionChange = (permission: Permission, isChecked: boolean) => {
    const newPermissions = new Set(permissions);
    if (isChecked) {
      newPermissions.add(permission);
    } else {
      newPermissions.delete(permission);
    }
    setPermissions(newPermissions);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert(t('addRoleModal.nameRequired'));
      return;
    }
    onAddRole({
      id: name.toLowerCase().replace(/\s+/g, '-'), // e.g., "Shift Manager" -> "shift-manager"
      name,
      permissions: Array.from(permissions),
    });
    // Reset and close
    setName('');
    setPermissions(new Set());
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[60] p-4">
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-xl w-full max-w-2xl flex flex-col h-[90vh]">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold text-gray-800">{t('addRoleModal.title')}</h2>
        </div>
        <div className="p-6 flex-grow overflow-y-auto space-y-6">
          <div>
            <label htmlFor="role-name" className="block text-sm font-medium text-gray-700">{t('addRoleModal.roleName')}</label>
            <div className="flex items-center space-x-2 mt-1">
                <input type="text" id="role-name" value={name} onChange={e => setName(e.target.value)} className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" required />
            </div>
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-800">{t('addRoleModal.permissions')}</h3>
             {Object.entries(PERMISSION_GROUPS).map(([key, group]) => (
                <div key={key} className="mt-4">
                    <h5 className="text-md font-semibold text-gray-600 mb-3 border-b pb-2">{t(group.labelKey)}</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {group.permissions.map(permission => (
                            <label key={permission} className="flex items-center space-x-3 p-2 rounded-md hover:bg-gray-50">
                                <input
                                    type="checkbox"
                                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                    checked={permissions.has(permission)}
                                    onChange={(e) => handlePermissionChange(permission, e.target.checked)}
                                />
                                <span className="text-sm text-gray-700">{t(`permissions.${permission}`)}</span>
                            </label>
                        ))}
                    </div>
                </div>
            ))}
          </div>
        </div>
        <div className="p-4 bg-gray-50 flex justify-end space-x-3 mt-auto border-t">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50">{t('addUserModal.cancel')}</button>
          <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700">{t('addRoleModal.addRole')}</button>
        </div>
      </form>
    </div>
  );
};

export default AddRoleModal;
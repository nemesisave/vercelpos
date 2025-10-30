import React, { useState, useEffect } from 'react';
import type { User, UserUpdatePayload, Role } from '../types';
import { useTranslations } from '../context/LanguageContext';

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  userToEdit: User;
  onUpdateUser: (userId: number, updates: UserUpdatePayload) => void;
  roles: Role[];
}

const EditUserModal: React.FC<EditUserModalProps> = ({ isOpen, onClose, userToEdit, onUpdateUser, roles }) => {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [roleId, setRoleId] = useState('');
  const { t } = useTranslations();

  useEffect(() => {
    if (userToEdit) {
        setName(userToEdit.name);
        setUsername(userToEdit.username);
        setRoleId(userToEdit.roleId);
        setPassword(''); // Always reset password field for security
    }
  }, [userToEdit]);
  

  if (!isOpen || !userToEdit) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !username || !roleId) {
        alert(t('app.emptyFieldsError'));
        return;
    }
    
    const updates: UserUpdatePayload = { name, username, roleId };
    if (password) {
        updates.password = password;
    }

    onUpdateUser(userToEdit.id, updates);
    onClose();
  };

  const selectedRole = roles.find(r => r.id === roleId);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[60] p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
        <form onSubmit={handleSubmit}>
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold text-gray-800">{t('editUserModal.title')}</h2>
          </div>
          <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            <div>
              <label htmlFor="edit-name" className="block text-sm font-medium text-gray-700">{t('editUserModal.fullName')}</label>
              <input type="text" id="edit-name" value={name} onChange={e => setName(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" required />
            </div>
             <div>
              <label htmlFor="edit-username" className="block text-sm font-medium text-gray-700">{t('editUserModal.username')}</label>
              <input type="text" id="edit-username" value={username} onChange={e => setUsername(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" required />
            </div>
            <div>
              <label htmlFor="edit-password" className="block text-sm font-medium text-gray-700">{t('editUserModal.newPassword')}</label>
              <input type="password" id="edit-password" value={password} onChange={e => setPassword(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" placeholder={t('editUserModal.passwordPlaceholder')} />
            </div>
            <div>
                <label htmlFor="edit-role" className="block text-sm font-medium text-gray-700">{t('editUserModal.role')}</label>
                <select id="edit-role" value={roleId} onChange={e => setRoleId(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md">
                    {roles.map(role => (
                        <option key={role.id} value={role.id}>{t(`roles.${role.id}`)}</option>
                    ))}
                </select>
                {selectedRole && (
                    <p className="text-xs text-gray-500 mt-2">{t(selectedRole.descriptionKey)}</p>
                )}
            </div>
          </div>
          <div className="p-4 bg-gray-50 flex justify-end space-x-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">{t('editUserModal.cancel')}</button>
            <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">{t('editUserModal.saveChanges')}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditUserModal;
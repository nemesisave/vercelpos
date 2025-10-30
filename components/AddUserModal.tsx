import React, { useState } from 'react';
import type { NewUserPayload, Role } from '../types';
import { useTranslations } from '../context/LanguageContext';

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddUser: (userData: NewUserPayload) => void;
  roles: Role[];
}

const AddUserModal: React.FC<AddUserModalProps> = ({ isOpen, onClose, onAddUser, roles }) => {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [roleId, setRoleId] = useState(roles.find(r => r.id === 'cashier')?.id || roles[0]?.id || '');
  const { t } = useTranslations();

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !username || !password || !roleId || !pin) {
        alert(t('app.fillAllFields'));
        return;
    }
     if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
        alert(t('addUserModal.pinError'));
        return;
    }
    
    onAddUser({ name, username, password, roleId, pin });

    // Reset form and close modal
    setName('');
    setUsername('');
    setPassword('');
    setPin('');
    setRoleId(roles.find(r => r.id === 'cashier')?.id || roles[0]?.id || '');
    onClose();
  };
  
  const selectedRole = roles.find(r => r.id === roleId);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-[60] p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
        <form onSubmit={handleSubmit}>
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold text-gray-800">{t('addUserModal.title')}</h2>
          </div>
          <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">{t('addUserModal.fullName')}</label>
              <input type="text" id="name" value={name} onChange={e => setName(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" required />
            </div>
             <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">{t('addUserModal.username')}</label>
              <input type="text" id="username" value={username} onChange={e => setUsername(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" required />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">{t('addUserModal.password')}</label>
                <input type="password" id="password" value={password} onChange={e => setPassword(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" required />
              </div>
               <div>
                <label htmlFor="pin" className="block text-sm font-medium text-gray-700">{t('addUserModal.pin')}</label>
                <input type="password" id="pin" value={pin} onChange={e => setPin(e.target.value)} maxLength={4} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" required />
              </div>
            </div>
            <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700">{t('addUserModal.role')}</label>
                <select id="role" value={roleId} onChange={e => setRoleId(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md">
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
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">{t('addUserModal.cancel')}</button>
            <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">{t('addUserModal.addUser')}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddUserModal;
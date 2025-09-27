import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { User } from '../types';

export default function UserList() {
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users');
      setUsers(response.data.users);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-lg font-bold mb-4">Online Users</h2>
      <div className="space-y-2">
        {users.map((user) => (
          <div key={user.id} className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${user.isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
            <span>{user.username}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

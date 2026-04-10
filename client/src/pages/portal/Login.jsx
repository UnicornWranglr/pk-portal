import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api';
import { useAuth } from '../../context/AuthContext';

export default function PortalLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      const data = await api.post('/auth/client/login', { email, password });
      login(data.user, data.token);
      navigate('/portal/users');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-md w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-1">PK-Portal</h1>
        <p className="text-sm text-gray-500 mb-6">Client Portal Sign In</p>
        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
        <label className="block text-sm font-medium mb-1">Email</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
          className="w-full border rounded px-3 py-2 mb-4 text-sm" />
        <label className="block text-sm font-medium mb-1">Password</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
          className="w-full border rounded px-3 py-2 mb-6 text-sm" />
        <button type="submit" className="w-full bg-indigo-600 text-white py-2 rounded text-sm font-medium hover:bg-indigo-700">
          Sign In
        </button>
      </form>
    </div>
  );
}

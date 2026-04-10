import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.post('/auth/login', { email, password });
      login(data.user, data.token);
      navigate(data.user.role === 'admin' ? '/admin/clients' : '/portal/users');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-md w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-1">Peak Client Portal</h1>
        <p className="text-sm text-gray-500 mb-6">Sign in to your account</p>
        {error && <p className="text-red-600 text-sm mb-4 bg-red-50 p-2 rounded">{error}</p>}
        <label className="block text-sm font-medium mb-1">Email</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
          placeholder="you@company.com"
          className="w-full border rounded px-3 py-2 mb-4 text-sm" />
        <label className="block text-sm font-medium mb-1">Password</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
          className="w-full border rounded px-3 py-2 mb-6 text-sm" />
        <button type="submit" disabled={loading}
          className="w-full bg-gray-900 text-white py-2 rounded text-sm font-medium hover:bg-gray-800 disabled:opacity-50">
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}

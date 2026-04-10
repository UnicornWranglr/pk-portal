import { useState, useEffect, useRef } from 'react';
import { api } from '../api';

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    loadCount();
    const interval = setInterval(loadCount, 30000);
    const onFocus = () => loadCount();
    window.addEventListener('focus', onFocus);
    return () => { clearInterval(interval); window.removeEventListener('focus', onFocus); };
  }, []);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function loadCount() {
    try {
      const { count } = await api.get('/portal/notifications/unread-count');
      setUnreadCount(count);
    } catch { /* ignore */ }
  }

  async function handleOpen() {
    if (!open) {
      const data = await api.get('/portal/notifications');
      setNotifications(data);
    }
    setOpen(!open);
  }

  async function markRead(id) {
    await api.put(`/portal/notifications/${id}/read`);
    setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
    setUnreadCount(Math.max(0, unreadCount - 1));
  }

  async function markAllRead() {
    await api.put('/portal/notifications/read-all');
    setNotifications(notifications.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  }

  return (
    <div className="relative" ref={ref}>
      <button onClick={handleOpen} className="relative p-1 text-indigo-200 hover:text-white">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-8 w-80 bg-white rounded-lg shadow-lg border z-50 max-h-96 overflow-auto">
          <div className="flex justify-between items-center px-4 py-3 border-b">
            <span className="text-sm font-bold text-gray-900">Notifications</span>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-indigo-600 hover:underline">Mark all read</button>
            )}
          </div>
          {notifications.length === 0 ? (
            <p className="text-center py-6 text-gray-400 text-sm">No notifications</p>
          ) : (
            <ul className="divide-y">
              {notifications.map(n => (
                <li key={n.id}
                  className={`px-4 py-3 text-sm cursor-pointer hover:bg-gray-50 ${n.read ? 'opacity-60' : ''}`}
                  onClick={() => !n.read && markRead(n.id)}>
                  <p className={`${n.read ? 'text-gray-500' : 'text-gray-900 font-medium'}`}>{n.message}</p>
                  <p className="text-xs text-gray-400 mt-1">{new Date(n.created_at).toLocaleString()}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

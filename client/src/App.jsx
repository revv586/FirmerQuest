import { useState } from 'react';
import './App.css';
import Loginpage from './pages/Loginpage.jsx';
import Logpage from './pages/Logpage.jsx';

export default function App() {
  // Persist token across refreshes.
  const [token, setToken] = useState(() => localStorage.getItem('token') || '');

  // Save token after login.
  const handleLogin = (t) => {
    localStorage.setItem('token', t);
    setToken(t);
  };

  // Clear token to log out.
  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken('');
  };

  return (
    <>
      {!token ? (
        <Loginpage onLogin={handleLogin} />
      ) : (
        <Logpage token={token} onLogout={handleLogout} />
      )}
    </>
  );
}

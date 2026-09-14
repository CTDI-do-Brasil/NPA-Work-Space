import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Dashboard from './components/Dashboard';

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in (token in localStorage)
    const storedToken = localStorage.getItem('accessToken');
    const storedUser = localStorage.getItem('currentUser');
    if (storedToken) {
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch {
          setUser({ username: 'admin', role: 'Admin' });
        }
      } else {
        setUser({ username: 'admin', role: 'Admin' });
      }
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData) => {
    if (userData) {
      localStorage.setItem('currentUser', JSON.stringify(userData));
    }
    setUser(userData);
  };

  const handleUpdateUser = (userData) => {
    if (userData) {
      localStorage.setItem('currentUser', JSON.stringify(userData));
    }
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('accessToken');
    setUser(null);
  };

  if (loading) return <div>Carregando...</div>;

  return (
    <Router>
      <Routes>
        <Route 
          path="/login" 
          element={!user ? <Login onLogin={handleLogin} /> : <Navigate to="/" />} 
        />
        <Route 
          path="/" 
          element={user ? <Dashboard user={user} onLogout={handleLogout} onUpdateUser={handleUpdateUser} /> : <Navigate to="/login" />} 
        />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
};

export default App;

import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Layout from './components/Layout';
import { useAuth } from './hooks/useAuth';
import { api } from './lib/api';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import NewSession from './pages/NewSession';
import Interview from './pages/Interview';
import Report from './pages/Report';
import Sessions from './pages/Sessions';
import React from 'react';

export default function App() {
  const nav = useNavigate();
  const { me, loading, refresh } = useAuth();

  const logout = async () => {
    await api.post('/api/auth/logout');
    await refresh();
    nav('/login');
  };

  if (loading) return <div className="container">로딩...</div>;

  return (
    <Routes>
      <Route
        path="/"
        element={
          <Layout me={me} onLogout={logout}>
            <Dashboard />
          </Layout>
        }
      />
      <Route
        path="/new"
        element={
          me ? (
            <Layout me={me} onLogout={logout}>
              <NewSession />
            </Layout>
          ) : (
            <Navigate to="/login" />
          )
        }
      />
      <Route
        path="/interview/:sessionId"
        element={
          <Layout me={me} onLogout={logout}>
            <Interview />
          </Layout>
        }
      />
      <Route
        path="/report/:sessionId"
        element={
          <Layout me={me} onLogout={logout}>
            <Report />
          </Layout>
        }
      />
      <Route
        path="/sessions"
        element={
          <Layout me={me} onLogout={logout}>
            <Sessions />
          </Layout>
        }
      />
      <Route
        path="/login"
        element={
          <Layout me={me} onLogout={logout}>
            <Login onAuthed={() => nav('/')} />
          </Layout>
        }
      />
      <Route
        path="/signup"
        element={
          <Layout me={me} onLogout={logout}>
            <Signup onAuthed={() => nav('/')} />
          </Layout>
        }
      />
    </Routes>
  );
}

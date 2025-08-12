import { Link } from 'react-router-dom';
import React from 'react';

export default function Layout({ me, onLogout, children }) {
  return (
    <div>
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 20px',
          borderBottom: '1px solid #1f2937',
          background: '#0b0f1a',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <Link to="/" style={{ fontWeight: 700 }}>
            AI Interview
          </Link>
          <Link to="/new">새 세션</Link>
          <Link to="/sessions">내 세션</Link>
        </div>
        <div>
          {me ? (
            <span style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <span style={{ opacity: 0.8 }}>{me.email}</span>
              <button onClick={onLogout}>로그아웃</button>
            </span>
          ) : (
            <span style={{ display: 'flex', gap: 12 }}>
              <Link to="/login">로그인</Link>
              <Link to="/signup">회원가입</Link>
            </span>
          )}
        </div>
      </header>
      <main className="container">{children}</main>
    </div>
  );
}

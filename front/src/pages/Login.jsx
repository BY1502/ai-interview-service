import { useState } from 'react';
import { api } from '../lib/api';
import React from 'react';

export default function Login({ onAuthed }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    const r = await api.post('/api/auth/login', { email, password });
    if (r.ok) onAuthed();
    else setErr('로그인 실패');
  };
  return (
    <div className="card" style={{ maxWidth: 420, margin: '40px auto' }}>
      <h2>로그인</h2>
      <form
        onSubmit={submit}
        className="row"
        style={{ flexDirection: 'column' }}
      >
        <input
          placeholder="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          placeholder="비밀번호"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {err && <div style={{ color: '#fca5a5' }}>{err}</div>}
        <button type="submit">로그인</button>
      </form>
    </div>
  );
}

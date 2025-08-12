import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import React from 'react';

export default function NewSession() {
  const nav = useNavigate();
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('backend');
  const [jobTitle, setJobTitle] = useState('Backend Engineer');
  const [level, setLevel] = useState('junior');
  const [difficulty, setDifficulty] = useState('medium');
  const [stack, setStack] = useState('');
  const [err, setErr] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    const payload = {
      company,
      role,
      job_title: jobTitle,
      level,
      difficulty,
      stack: stack
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    };
    const r = await api.post('/api/sessions', payload);
    if (!r.ok) {
      setErr('세션 생성 실패(로그인 여부/필드 확인)');
      return;
    }
    const data = await r.json();
    nav(`/interview/${data.session_id}`);
  };

  return (
    <div className="card">
      <h2>새 세션 생성</h2>
      <form
        onSubmit={submit}
        className="row"
        style={{ flexDirection: 'column' }}
      >
        <input
          placeholder="회사명"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
        />
        <div className="row">
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="backend">backend</option>
            <option value="data">data</option>
            <option value="ml">ml</option>
          </select>
          <input
            placeholder="직무명"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
          />
        </div>
        <div className="row">
          <select value={level} onChange={(e) => setLevel(e.target.value)}>
            <option>junior</option>
            <option>mid</option>
            <option>senior</option>
          </select>
          <select
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
          >
            <option>easy</option>
            <option>medium</option>
            <option>hard</option>
          </select>
        </div>
        <input
          placeholder="스택(쉼표로 구분 e.g. Python,FastAPI)"
          value={stack}
          onChange={(e) => setStack(e.target.value)}
        />
        {err && <div style={{ color: '#fca5a5' }}>{err}</div>}
        <button type="submit">예상 질문 생성</button>
      </form>
    </div>
  );
}

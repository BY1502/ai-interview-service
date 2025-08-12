import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Link } from 'react-router-dom';
import React from 'react';

export default function Sessions() {
  const [list, setList] = useState([]);
  const [company, setCompany] = useState('');
  const load = async () => {
    const r = await api.get(
      `/api/sessions/mine${
        company ? `?company=${encodeURIComponent(company)}` : ''
      }`
    );
    setList(r.ok ? await r.json() : []);
  };
  useEffect(() => {
    load();
  }, []);
  return (
    <div className="card">
      <h2>내 세션</h2>
      <div className="row">
        <input
          placeholder="회사명 필터"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
        />
        <button onClick={load}>필터 적용</button>
      </div>
      <table style={{ width: '100%', marginTop: 12 }}>
        <thead>
          <tr>
            <th align="left">회사</th>
            <th align="left">직무</th>
            <th>레벨</th>
            <th>난이도</th>
            <th>생성일</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {list.map((r) => (
            <tr key={r.id}>
              <td>{r.company}</td>
              <td>{r.job_title}</td>
              <td align="center">{r.level}</td>
              <td align="center">{r.difficulty}</td>
              <td>{new Date(r.created_at).toLocaleString()}</td>
              <td>
                <Link to={`/interview/${r.id}`}>열기</Link> |{' '}
                <Link to={`/report/${r.id}`}>리포트</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

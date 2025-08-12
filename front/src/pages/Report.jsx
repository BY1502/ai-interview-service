import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api';
import ReactMarkdown from 'react-markdown';
import React from 'react';

export default function Report() {
  const { sessionId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      let r = await api.get(`/api/sessions/${sessionId}/report`);
      if (!r.ok) {
        setLoading(false);
        return;
      }
      setData(await r.json());
      setLoading(false);
    })();
  }, [sessionId]);

  const regenerate = async () => {
    const r = await api.post(`/api/sessions/${sessionId}/report`);
    if (r.ok) {
      const d = await r.json();
      setData(d);
    } else alert('생성 실패');
  };

  if (loading) return <div>리포트 로딩...</div>;
  if (!data)
    return (
      <div className="card">
        리포트가 없습니다. 먼저 생성해 주세요.{' '}
        <button onClick={regenerate}>리포트 생성</button>
      </div>
    );

  return (
    <div className="card">
      <h2>총점: {data.total_score ?? '-'}</h2>
      <h3>요약</h3>
      <ReactMarkdown>{data.summary_md || ''}</ReactMarkdown>
      <h3>다음 연습</h3>
      <ReactMarkdown>{data.suggestions_md || ''}</ReactMarkdown>
      <button onClick={regenerate}>다시 생성</button>
    </div>
  );
}

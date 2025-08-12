import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import React from 'react';

export default function Interview() {
  const { sessionId } = useParams();
  const nav = useNavigate();
  const [session, setSession] = useState(null);
  const [answers, setAnswers] = useState({});
  const [text, setText] = useState('');

  useEffect(() => {
    (async () => {
      const r = await api.get(`/api/sessions/${sessionId}`);
      if (r.ok) setSession(await r.json());
    })();
  }, [sessionId]);

  const currentQ = session?.questions?.[0]; // 데모: 첫 문항만
  const submitAnswer = async () => {
    if (!currentQ) return;
    const r = await api.post('/api/answers', {
      question_id: currentQ.id,
      type: 'text',
      transcript: text,
      duration_sec: 0,
    });
    if (r.ok) {
      const res = await r.json();
      setAnswers((a) => ({ ...a, [currentQ.id]: res }));
      alert('답변 저장/분석 완료');
    }
  };

  const genReport = async () => {
    const r = await api.post(`/api/sessions/${sessionId}/report`);
    if (r.ok) nav(`/report/${sessionId}`);
    else alert('리포트 생성 실패');
  };

  if (!session) return <div>세션 로딩...</div>;

  return (
    <div className="row">
      <div className="card" style={{ flex: '1 1 260px' }}>
        <h3>질문 목록</h3>
        <ul>
          {session.questions?.map((q) => (
            <li key={q.id} style={{ margin: '8px 0' }}>
              <span style={{ opacity: 0.9 }}>{q.text}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="card" style={{ flex: '3 1 520px' }}>
        <h3>현재 질문</h3>
        {currentQ ? (
          <>
            <p style={{ opacity: 0.8 }}>{currentQ.text}</p>
            <textarea
              rows={6}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="여기에 답변을 입력하세요"
            />
            <div className="row">
              <button onClick={submitAnswer}>답변 제출</button>
              <button onClick={genReport}>리포트 생성</button>
              <Link to={`/report/${sessionId}`}>
                <button>리포트 보기</button>
              </Link>
            </div>
          </>
        ) : (
          <p>질문이 없습니다.</p>
        )}
      </div>
    </div>
  );
}

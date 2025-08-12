import { Link } from 'react-router-dom';
import React from 'react';

export default function Dashboard() {
  return (
    <div className="row">
      <div className="card" style={{ flex: '1 1 320px' }}>
        <h3>빠른 시작</h3>
        <p>회사/직무/스택을 입력해 예상 질문을 생성하세요.</p>
        <Link to="/new">
          <button>새 연습 시작</button>
        </Link>
      </div>
      <div className="card" style={{ flex: '2 1 520px' }}>
        <h3>알림</h3>
        <p>로그인 후 세션을 생성하면 여기 요약이 표시됩니다.</p>
      </div>
    </div>
  );
}

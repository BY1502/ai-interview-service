import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useNavigate,
  useParams,
  Navigate,
} from 'react-router-dom';

/**
 * React SPA with auth (login/signup) + company-aware sessions
 * Pages:
 *  - /login, /signup
 *  - / (Home -> requires auth): create session with company field
 *  - /interview/:sessionId : answer text or upload audio
 *  - /report/:sessionId : view final report
 *  - /sessions : "내 질문/세션" 리스트 (회사별 그룹)
 *
 * NOTE: Backend should expose:
 *  POST /auth/signup {email,password}
 *  POST /auth/login {email,password}  -> set HttpOnly cookie
 *  POST /auth/logout                    -> clear cookie
 *  GET  /me                             -> {id,email}
 *  POST /api/sessions {role,job_title,level,stack[],difficulty,company}
 *  GET  /api/sessions/:id
 *  GET  /api/sessions/mine?company=ACME (optional) -> list
 */

function useLocalStorage(key, initial) {
  const [val, setVal] = useState(() => {
    const s = localStorage.getItem(key);
    return s != null ? JSON.parse(s) : initial;
  });
  useEffect(() => localStorage.setItem(key, JSON.stringify(val)), [key, val]);
  return [val, setVal];
}

function useAuth(baseUrl) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`${baseUrl}/me`, { credentials: 'include' });
        if (res.ok) {
          const u = await res.json();
          if (alive) setUser(u);
        } else {
          if (alive) setUser(null);
        }
      } catch {
        setUser(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [baseUrl]);
  return { user, setUser, loading };
}

function Topbar({ baseUrl, setBaseUrl, user, onLogout }) {
  return (
    <header className="flex items-center justify-between px-4 py-3 border-b sticky top-0 z-10 text-white bg-gray-900">
      <div className="flex items-center gap-3">
        <Link to="/" className="font-semibold text-white">
          AI Interview
        </Link>
        <Link to="/sessions" className="text-sm opacity-80 hover:opacity-100">
          내 세션
        </Link>
      </div>
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="opacity-60 text-white">Backend URL</span>
          <input
            className="border rounded px-2 py-1 w-[260px] bg-gray-800 text-white"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
          />
        </div>
        {user ? (
          <div className="flex items-center gap-2">
            <span className="opacity-80">{user.email}</span>
            <button onClick={onLogout} className="border rounded px-3 py-1">
              로그아웃
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link to="/login" className="underline">
              로그인
            </Link>
            <Link to="/signup" className="underline">
              회원가입
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}

function RequireAuth({ user, loading, children }) {
  if (loading)
    return (
      <div className="p-6 text-white bg-gray-900 min-h-screen">
        불러오는 중...
      </div>
    );
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function Login({ baseUrl, setUser }) {
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) throw new Error(await res.text());
      const me = await fetch(`${baseUrl}/me`, { credentials: 'include' }).then(
        (r) => r.json()
      );
      setUser(me);
      nav('/');
    } catch (e) {
      setError(e.message || '로그인 실패');
    }
  }

  return (
    <div className="max-w-md mx-auto p-6 text-white bg-gray-900 min-h-screen">
      <h1 className="text-2xl font-bold mb-4">로그인</h1>
      <form onSubmit={onSubmit} className="grid gap-3">
        <input
          className="border rounded px-3 py-2 bg-gray-800 text-white"
          placeholder="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          className="border rounded px-3 py-2 bg-gray-800 text-white"
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <div className="text-red-400 text-sm">{error}</div>}
        <button className="bg-black text-white rounded px-4 py-2">
          로그인
        </button>
        <div className="opacity-70 text-sm">
          처음이신가요?{' '}
          <Link to="/signup" className="underline">
            회원가입
          </Link>
        </div>
      </form>
    </div>
  );
}

function Signup({ baseUrl }) {
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch(`${baseUrl}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) throw new Error(await res.text());
      nav('/login');
    } catch (e) {
      setError(e.message || '회원가입 실패');
    }
  }

  return (
    <div className="max-w-md mx-auto p-6 text-white bg-gray-900 min-h-screen">
      <h1 className="text-2xl font-bold mb-4">회원가입</h1>
      <form onSubmit={onSubmit} className="grid gap-3">
        <input
          className="border rounded px-3 py-2 bg-gray-800 text-white"
          placeholder="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          className="border rounded px-3 py-2 bg-gray-800 text-white"
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <div className="text-red-400 text-sm">{error}</div>}
        <button className="bg-black text-white rounded px-4 py-2">
          가입하기
        </button>
        <div className="opacity-70 text-sm">
          이미 계정이 있나요?{' '}
          <Link to="/login" className="underline">
            로그인
          </Link>
        </div>
      </form>
    </div>
  );
}

function Home({ baseUrl, user }) {
  const nav = useNavigate();
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('backend');
  const [jobTitle, setJobTitle] = useState('Backend Engineer');
  const [level, setLevel] = useState('junior');
  const [stack, setStack] = useState('Python, FastAPI, PostgreSQL');
  const [difficulty, setDifficulty] = useState('medium');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const canSubmit =
    baseUrl && role && jobTitle && level && difficulty && company;

  async function createSession() {
    if (!canSubmit) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${baseUrl}/api/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          role,
          job_title: jobTitle,
          level,
          stack: stack
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean),
          difficulty,
          company,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      nav(`/interview/${data.session_id}`);
    } catch (e) {
      setError(e.message || '세션 생성 실패');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-6 text-white bg-gray-900 min-h-screen">
      <div className="text-center py-12">
        <h1 className="text-3xl font-bold mb-3">AI 면접 연습 시작하기</h1>
        <p className="opacity-70">
          지원하시는 회사명, 직무, 직책, 경력, 기술 스택을 입력 해주세요.
        </p>
      </div>

      <div className="grid gap-4">
        <div>
          <label className="block text-sm mb-1">회사명 (company)</label>
          <input
            className="border rounded w-full px-3 py-2 bg-gray-800 text-white"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm mb-1">직무 (role)</label>
          <input
            className="border rounded w-full px-3 py-2 bg-gray-800 text-white"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm mb-1">직책 (job_title)</label>
          <input
            className="border rounded w-full px-3 py-2 bg-gray-800 text-white"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">경력 (level)</label>
            <select
              className="border rounded w-full px-3 py-2 bg-gray-800 text-white"
              value={level}
              onChange={(e) => setLevel(e.target.value)}
            >
              <option>junior</option>
              <option>mid</option>
              <option>senior</option>
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">난이도 (difficulty)</label>
            <select
              className="border rounded w-full px-3 py-2 bg-gray-800 text-white"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
            >
              <option>easy</option>
              <option>medium</option>
              <option>hard</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm mb-1">기술 스택 (쉼표로 구분)</label>
          <input
            className="border rounded w-full px-3 py-2 bg-gray-800 text-white"
            value={stack}
            onChange={(e) => setStack(e.target.value)}
          />
        </div>
        {error && <div className="text-red-400 text-sm">{error}</div>}
        <div className="pt-2">
          <button
            disabled={!canSubmit || loading}
            onClick={createSession}
            className="bg-black text-white rounded px-4 py-2 disabled:opacity-50"
          >
            {loading ? '생성 중...' : '예상 질문 생성하기'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Interview({ baseUrl }) {
  const { sessionId } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [session, setSession] = useState(null);
  const [answers, setAnswers] = useState({}); // qid -> {text, analytics}
  const fileRefs = useRef({});

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${baseUrl}/api/sessions/${sessionId}`, {
          credentials: 'include',
        });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        setSession(data);
      } catch (e) {
        setError(e.message || 'load error');
      } finally {
        setLoading(false);
      }
    })();
  }, [baseUrl, sessionId]);

  async function submitText(qid) {
    const text = answers[qid]?.text || '';
    if (!text.trim()) return;
    const res = await fetch(`${baseUrl}/api/answers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        question_id: Number(qid),
        type: 'text',
        transcript: text,
        duration_sec: 60,
      }),
    });
    const data = await res.json();
    setAnswers((a) => ({
      ...a,
      [qid]: { ...(a[qid] || {}), analytics: data.analytics },
    }));
  }

  async function uploadAudio(qid) {
    const f = fileRefs.current[qid]?.files?.[0];
    if (!f) return;
    const fd = new FormData();
    fd.append('question_id', qid);
    fd.append('language', 'ko');
    fd.append('file', f);
    const res = await fetch(`${baseUrl}/api/uploads/audio`, {
      method: 'POST',
      body: fd,
      credentials: 'include',
    });
    const data = await res.json();
    setAnswers((a) => ({
      ...a,
      [qid]: {
        ...(a[qid] || {}),
        text: data.transcript,
        analytics: data.analytics,
      },
    }));
  }

  async function generateReport() {
    await fetch(`${baseUrl}/api/sessions/${sessionId}/report`, {
      method: 'POST',
      credentials: 'include',
    });
    window.location.href = `/report/${sessionId}`;
  }

  if (loading)
    return (
      <div className="p-6 text-white bg-gray-900 min-h-screen">
        불러오는 중...
      </div>
    );
  if (error)
    return (
      <div className="p-6 text-red-400 bg-gray-900 min-h-screen">{error}</div>
    );

  return (
    <div className="max-w-4xl mx-auto p-6 text-white bg-gray-900 min-h-screen">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">세션 #{sessionId}</h1>
        <button
          onClick={generateReport}
          className="bg-black text-white rounded px-3 py-2"
        >
          리포트 생성하기
        </button>
      </div>

      <p className="opacity-70 mb-6">
        예상 질문에 답변을 제출하세요. 텍스트 또는 음성 파일 업로드가
        가능합니다.
      </p>

      <div className="space-y-6">
        {(session.questions || []).map((q) => (
          <div key={q.id} className="border rounded-2xl p-4 bg-gray-800">
            <div className="font-medium mb-1">
              Q{q.id}. {q.text}
            </div>
            <div className="text-xs opacity-60 mb-2">
              keywords: {q.rubric_keywords}
            </div>

            <textarea
              className="w-full border rounded p-2 mb-2 bg-gray-900 text-white"
              rows={4}
              placeholder="텍스트 답변을 입력하세요"
              value={answers[q.id]?.text || ''}
              onChange={(e) =>
                setAnswers((a) => ({
                  ...a,
                  [q.id]: { ...(a[q.id] || {}), text: e.target.value },
                }))
              }
            />
            <div className="flex items-center gap-2 mb-2">
              <button
                onClick={() => submitText(q.id)}
                className="bg-black text-white rounded px-3 py-2"
              >
                텍스트 제출
              </button>
              <input
                type="file"
                accept="audio/*"
                ref={(el) => (fileRefs.current[q.id] = el)}
                className="text-sm"
              />
              <button
                onClick={() => uploadAudio(q.id)}
                className="border rounded px-3 py-2"
              >
                음성 업로드
              </button>
            </div>

            {answers[q.id]?.analytics && (
              <div className="text-sm bg-gray-900 border rounded p-2">
                <b>분석</b>: WPM {answers[q.id].analytics.wpm}, filler{' '}
                {answers[q.id].analytics.filler_ratio}, keyword{' '}
                {answers[q.id].analytics.keyword_hit_rate}, clarity{' '}
                {answers[q.id].analytics.clarity_score}, coherence{' '}
                {answers[q.id].analytics.coherence_score}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Report({ baseUrl }) {
  const { sessionId } = useParams();
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${baseUrl}/api/sessions/${sessionId}/report`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setReport(data);
    } catch (e) {
      setError(e.message || 'load error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [sessionId, baseUrl]);

  return (
    <div className="max-w-3xl mx-auto p-6 text-white bg-gray-900 min-h-screen">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">리포트 보기 (세션 #{sessionId})</h1>
        <Link to={`/interview/${sessionId}`} className="underline">
          질문/답변으로 돌아가기
        </Link>
      </div>

      {loading && <div>불러오는 중...</div>}
      {error && <div className="text-red-400">{error}</div>}

      {report && (
        <div className="space-y-6">
          <div className="border rounded-2xl p-4 bg-gray-800">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-semibold">요약</h2>
              <div className="text-sm opacity-70">
                총점 <b>{report.total_score}</b>
              </div>
            </div>
            <pre className="whitespace-pre-wrap text-sm">
              {report.summary_md || '(요약 없음)'}
            </pre>
          </div>
          <div className="border rounded-2xl p-4 bg-gray-800">
            <h2 className="text-xl font-semibold mb-2">다음 연습</h2>
            <pre className="whitespace-pre-wrap text-sm">
              {report.suggestions_md || '(제안 없음)'}
            </pre>
          </div>
        </div>
      )}

      {!report && !loading && (
        <div className="mt-4">
          <button
            onClick={async () => {
              await fetch(`${baseUrl}/api/sessions/${sessionId}/report`, {
                method: 'POST',
                credentials: 'include',
              });
              load();
            }}
            className="bg-black text-white rounded px-3 py-2"
          >
            리포트 생성
          </button>
        </div>
      )}
    </div>
  );
}

function MySessions({ baseUrl }) {
  const [items, setItems] = useState([]);
  const [company, setCompany] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const q = company ? `?company=${encodeURIComponent(company)}` : '';
      const res = await fetch(`${baseUrl}/api/sessions/mine${q}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setItems(data);
    } catch (e) {
      setError(e.message || 'load error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [baseUrl]);

  return (
    <div className="max-w-4xl mx-auto p-6 text-white bg-gray-900 min-h-screen">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">내 세션</h1>
        <div className="flex items-center gap-2">
          <input
            className="border rounded px-3 py-2 bg-gray-800 text-white"
            placeholder="회사 필터"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
          />
          <button onClick={load} className="border rounded px-3 py-2">
            조회
          </button>
        </div>
      </div>

      {loading && <div>불러오는 중...</div>}
      {error && <div className="text-red-400">{error}</div>}

      <div className="grid gap-3">
        {items.map((s) => (
          <div key={s.id} className="border rounded-2xl p-4 bg-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">
                  {s.company || '(회사명 없음)'}
                </div>
                <div className="text-sm opacity-70">
                  {s.role} • {s.job_title} • {s.level} • {s.difficulty}
                </div>
                <div className="text-xs opacity-60">
                  {new Date(s.created_at).toLocaleString()}
                </div>
              </div>
              <div className="flex gap-2">
                <Link to={`/interview/${s.id}`} className="underline">
                  세션 열기
                </Link>
                <Link to={`/report/${s.id}`} className="underline">
                  리포트
                </Link>
              </div>
            </div>
          </div>
        ))}
        {!loading && items.length === 0 && (
          <div className="opacity-70">데이터가 없습니다.</div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [baseUrl, setBaseUrl] = useLocalStorage(
    'aii.baseUrl',
    'http://127.0.0.1:8000'
  );
  const { user, setUser, loading } = useAuth(baseUrl);

  async function onLogout() {
    await fetch(`${baseUrl}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
    setUser(null);
  }

  return (
    <BrowserRouter>
      <Topbar
        baseUrl={baseUrl}
        setBaseUrl={setBaseUrl}
        user={user}
        onLogout={onLogout}
      />
      <Routes>
        <Route
          path="/login"
          element={<Login baseUrl={baseUrl} setUser={setUser} />}
        />
        <Route path="/signup" element={<Signup baseUrl={baseUrl} />} />

        <Route
          path="/"
          element={
            <RequireAuth user={user} loading={loading}>
              <Home baseUrl={baseUrl} user={user} />
            </RequireAuth>
          }
        />
        <Route
          path="/interview/:sessionId"
          element={
            <RequireAuth user={user} loading={loading}>
              <Interview baseUrl={baseUrl} />
            </RequireAuth>
          }
        />
        <Route
          path="/report/:sessionId"
          element={
            <RequireAuth user={user} loading={loading}>
              <Report baseUrl={baseUrl} />
            </RequireAuth>
          }
        />
        <Route
          path="/sessions"
          element={
            <RequireAuth user={user} loading={loading}>
              <MySessions baseUrl={baseUrl} />
            </RequireAuth>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

import React, { useEffect, useMemo, useState } from 'react';
import ReactMarkdown from 'react-markdown';

// Minimal, single-file React page to view a session's final report.
// 1) Start your FastAPI server on http://127.0.0.1:8000
// 2) Enter the Session ID and click "Load Report"
// 3) The page will render Markdown (summary & suggestions) nicely

export default function ReportViewer() {
  const [baseUrl, setBaseUrl] = useState('http://127.0.0.1:8000');
  const [sessionId, setSessionId] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [report, setReport] = useState(null);

  const canLoad = useMemo(() => !!sessionId && !!baseUrl, [sessionId, baseUrl]);

  const loadReport = async () => {
    setLoading(true);
    setError('');
    setReport(null);
    try {
      const res = await fetch(`${baseUrl}/api/sessions/${sessionId}/report`);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setReport(data);
    } catch (e) {
      setError(e.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 p-6">
      <div className="max-w-3xl mx-auto">
        <header className="flex items-center justify-between gap-3 mb-6">
          <h1 className="text-2xl font-bold">AI Interview – Report Viewer</h1>
          <a
            className="text-sm underline opacity-70 hover:opacity-100"
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setBaseUrl('http://127.0.0.1:8000');
            }}
          >
            reset URL
          </a>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          <div className="md:col-span-2">
            <label className="block text-sm mb-1">Backend Base URL</label>
            <input
              className="w-full rounded-2xl border border-neutral-300 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black/10"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="http://127.0.0.1:8000"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Session ID</label>
            <input
              type="number"
              className="w-full rounded-2xl border border-neutral-300 bg-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black/10"
              value={sessionId}
              onChange={(e) => setSessionId(Number(e.target.value))}
            />
          </div>
        </div>

        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={loadReport}
            disabled={!canLoad || loading}
            className="rounded-2xl bg-black text-white px-4 py-2 shadow hover:opacity-90 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Load Report'}
          </button>
          {error && <span className="text-red-600 text-sm">{error}</span>}
        </div>

        {report && (
          <div className="space-y-6">
            <div className="rounded-2xl bg-white shadow p-5">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                <h2 className="text-xl font-semibold">Summary</h2>
                <div className="inline-flex items-center gap-2 rounded-2xl bg-neutral-100 px-3 py-1">
                  <span className="text-sm opacity-60">Total Score</span>
                  <span className="text-lg font-bold">
                    {report.total_score}
                  </span>
                </div>
              </div>
              <article className="prose max-w-none prose-headings:mt-4 prose-p:leading-relaxed">
                <ReactMarkdown>
                  {report.summary_md || '(no summary)'}
                </ReactMarkdown>
              </article>
            </div>

            <div className="rounded-2xl bg-white shadow p-5">
              <h2 className="text-xl font-semibold mb-3">Next Suggestions</h2>
              <article className="prose max-w-none prose-headings:mt-4 prose-p:leading-relaxed">
                <ReactMarkdown>
                  {report.suggestions_md || '(no suggestions)'}
                </ReactMarkdown>
              </article>
            </div>

            <footer className="text-xs opacity-60 text-center py-6">
              Rendered locally • Session {report.session_id} •{' '}
              {new Date(report.created_at || Date.now()).toLocaleString()}
            </footer>
          </div>
        )}
      </div>
    </div>
  );
}

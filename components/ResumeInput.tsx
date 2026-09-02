'use client';

import { useState } from 'react';
import { SAMPLE_PROFILES } from '@/data/samples';
import type { AnalysisResult } from '@/types';
import { INPUT_GUARD } from '@/lib/prompts/extract';

export default function ResumeInput({
  onResult,
}: {
  onResult: (r: AnalysisResult) => void;
}) {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const tooShort = text.trim().length > 0 && text.trim().length < INPUT_GUARD.minChars;

  async function analyze() {
    setError(null);
    if (text.trim().length < INPUT_GUARD.minChars) {
      setError(`경력 내용을 ${INPUT_GUARD.minChars}자 이상 붙여넣어 주세요.`);
      return;
    }
    setLoading(true);
    try {
      // TODO(A): /api/analyze 연결. 지금은 mock으로 관통만 확인.
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeText: text }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.message ?? '분석에 실패했습니다.');
      onResult(json.data);
    } catch {
      setError('아직 분석 서버가 연결되지 않았습니다. 아래 예시로 먼저 확인해 보세요.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <section>
        <h2 className="text-sm font-medium opacity-70">예시로 바로 보기</h2>
        <div className="mt-3 grid gap-2.5 sm:grid-cols-3">
          {SAMPLE_PROFILES.map((s) => (
            <button
              key={s.id}
              onClick={() => onResult(s.cachedResult)}
              className="rounded-xl border border-black/10 p-3.5 text-left transition hover:border-amber-400/70 hover:bg-amber-400/[0.05] dark:border-white/12"
            >
              <span className="block text-sm font-medium">{s.label}</span>
              <span className="mt-1 block text-xs opacity-55">{s.hint}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-medium opacity-70">내 이력서로 보기</h2>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={9}
          maxLength={INPUT_GUARD.maxChars}
          placeholder={'경력 사항을 붙여넣어 주세요.\n\n예) 그로스 마케터 5년차입니다. 결제 퍼널 A/B 테스트를 설계해 전환율을 12% 개선했고...'}
          className="mt-3 w-full resize-y rounded-xl border border-black/10 bg-transparent p-4 text-sm leading-relaxed outline-none transition placeholder:opacity-35 focus:border-amber-400/60 dark:border-white/12"
        />

        <div className="mt-2 flex items-center justify-between text-xs">
          <span className={tooShort ? 'text-rose-500' : 'opacity-45'}>
            {text.trim().length.toLocaleString()} / {INPUT_GUARD.minChars}자 이상
          </span>
          <span className="opacity-45">입력한 내용은 저장하지 않습니다</span>
        </div>

        {error && <p className="mt-3 text-xs text-rose-500">{error}</p>}

        <button
          onClick={analyze}
          disabled={loading}
          className="mt-5 w-full rounded-xl bg-amber-400 px-5 py-3.5 text-sm font-semibold text-black transition hover:bg-amber-300 disabled:opacity-45"
        >
          {loading ? '분석하는 중…' : '경로 찾기'}
        </button>
      </section>
    </div>
  );
}

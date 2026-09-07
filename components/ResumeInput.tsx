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
      setError(`경험을 ${INPUT_GUARD.minChars}자 이상 적어주세요. 프로젝트·인턴 경험도 괜찮습니다.`);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeText: text }),
      });
      const json = await res.json();
      if (!json.ok) {
        setError(json.message ?? '분석에 실패했습니다.');
        return;
      }
      onResult(json.data);
    } catch (e) {
      setError(e instanceof Error ? `분석 서버와 통신하지 못했습니다: ${e.message}` : '분석 서버와 통신하지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <section>
        <h2 className="text-sm font-medium opacity-70">예시로 바로 보기</h2>
        <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
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
        <h2 className="text-sm font-medium opacity-70">내 경험으로 보기</h2>
        <p className="mt-1 text-xs leading-relaxed opacity-55">
          경력이 없어도 괜찮아요. <strong className="font-medium opacity-80">팀 프로젝트 · 인턴 · 전공 수업 · 동아리</strong> 경험도 그대로 분석됩니다.
        </p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={9}
          maxLength={INPUT_GUARD.maxChars}
          placeholder={'무엇을 해 봤는지 적어주세요. 직함보다 \u0027한 일\u0027이 중요합니다.\n\n예) 팀 프로젝트에서 기능 명세서를 작성해 개발 팀원과 조율했고,\n    이용자 12명을 인터뷰해 불편 지점을 정리했습니다.'}
          className="mt-3 w-full resize-y rounded-xl border border-black/10 bg-transparent p-4 text-sm leading-relaxed outline-none transition placeholder:opacity-35 focus:border-amber-400/60 dark:border-white/12"
        />

        <div className="mt-2 flex items-center justify-between text-xs">
          <span className={tooShort ? 'text-rose-500' : 'opacity-45'}>
            {text.trim().length.toLocaleString()} / {INPUT_GUARD.minChars}~{INPUT_GUARD.maxChars.toLocaleString()}자
          </span>
          <span className="opacity-45">서버·DB에는 저장하지 않습니다</span>
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

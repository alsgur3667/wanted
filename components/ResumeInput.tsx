'use client';

import { useState } from 'react';
import { SAMPLE_PROFILES } from '@/data/samples';
import type { AnalysisResult } from '@/types';
import { INPUT_GUARD } from '@/lib/prompts/extract';
import RouteSearchLoader from './RouteSearchLoader';
import PrivacyNotice from './PrivacyNotice';
import ResumeFileDrop from './ResumeFileDrop';

// 경로 탐색 화면을 이 컴포넌트 안에서 띄운다. 부모가 띄우면 입력 폼이 언마운트되어
// 실패했을 때 사용자가 써 둔 이력서가 통째로 날아간다.
export default function ResumeInput({
  onResult,
}: {
  onResult: (r: AnalysisResult) => void;
}) {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [pending, setPending] = useState<AnalysisResult | null>(null);

  const tooShort = text.trim().length > 0 && text.trim().length < INPUT_GUARD.minChars;

  async function analyze() {
    setError(null);
    if (text.trim().length < INPUT_GUARD.minChars) {
      setError(`경험을 ${INPUT_GUARD.minChars}자 이상 적어주세요. 프로젝트·인턴 경험도 괜찮습니다.`);
      return;
    }

    // 탐색 화면을 먼저 띄우고 그 뒤에서 분석을 돌린다.
    // 순서를 바꾸면 사용자가 빈 화면을 보다가 탐색 화면을 또 보게 된다.
    setPending(null);
    setSearching(true);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeText: text }),
      });
      const json = await res.json();
      if (!json.ok) {
        setError(json.message ?? '분석에 실패했습니다.');
        setSearching(false);
        return;
      }
      setPending(json.data);
    } catch (e) {
      setError(
        e instanceof Error
          ? `분석 서버와 통신하지 못했습니다: ${e.message}`
          : '분석 서버와 통신하지 못했습니다.'
      );
      setSearching(false);
    }
  }

  /** 예시도 같은 화면을 거친다 — 결과가 이미 있어도 오는 길은 같아야 한다 */
  function showSample(result: AnalysisResult) {
    setError(null);
    setPending(result);
    setSearching(true);
  }

  if (searching) {
    return (
      <RouteSearchLoader
        ready={pending !== null}
        onDone={() => pending && onResult(pending)}
      />
    );
  }

  return (
    <div>
      <section>
        <h2 className="text-[11px] font-medium uppercase tracking-wider text-faint">예시로 바로 보기</h2>
        <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
          {SAMPLE_PROFILES.map((s) => (
            <button
              key={s.id}
              onClick={() => showSample(s.cachedResult)}
              className="rounded-lg border border-hairline bg-elevated p-3.5 text-left transition-colors hover:border-link/50 hover:bg-link-soft"
            >
              <span className="block text-sm font-medium">{s.label}</span>
              <span className="mt-1 block text-[12px] text-mute">{s.hint}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-[11px] font-medium uppercase tracking-wider text-faint">내 경험으로 보기</h2>
        <p className="mt-1 text-[12px] leading-[1.6] text-mute">
          경력이 없어도 괜찮아요. <strong className="font-medium text-ink">팀 프로젝트 · 인턴 · 전공 수업 · 동아리</strong> 경험도 그대로 분석됩니다.
        </p>

        {/* 파일에서 뽑은 글자는 아래 칸으로 들어간다. 곧장 분석으로 보내지 않는
            이유는 ResumeFileDrop 위에 적어 두었다 — 요약하면, 보내기 전에
            무엇이 보내지는지 사용자가 볼 수 있어야 한다. */}
        <div className="mt-3">
          <ResumeFileDrop
            onText={(t) => {
              setText(t);
              setError(null);
            }}
          />
        </div>

        <p className="mt-4 text-[11px] text-faint">또는 직접 적기</p>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={9}
          maxLength={INPUT_GUARD.maxChars}
          placeholder={'무엇을 해 봤는지 적어주세요. 직함보다 \u0027한 일\u0027이 중요합니다.\n이름과 회사명은 적지 않아도 결과는 같습니다.\n\n예) 팀 프로젝트에서 기능 명세서를 작성해 개발 팀원과 조율했고,\n    이용자 12명을 인터뷰해 불편 지점을 정리했습니다.'}
          className="mt-1.5 w-full resize-y rounded-md border border-hairline bg-elevated p-4 text-[13px] leading-[1.7] text-ink outline-none transition-colors placeholder:text-faint focus:border-link"
        />

        <div className="mt-2 text-xs">
          <span className={tooShort ? 'text-error' : 'text-faint'}>
            {text.trim().length.toLocaleString()} / {INPUT_GUARD.minChars}~
            {INPUT_GUARD.maxChars.toLocaleString()}자
          </span>
        </div>

        <PrivacyNotice />

        {error && <p className="mt-3 text-xs text-error">{error}</p>}

        <button
          onClick={analyze}
          className="mt-5 w-full rounded-full bg-ink px-5 py-3.5 text-[15px] font-medium text-canvas transition-opacity hover:opacity-85"
        >
          경로 찾기
        </button>
      </section>
    </div>
  );
}

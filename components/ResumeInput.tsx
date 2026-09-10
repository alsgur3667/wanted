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
  onSearchingChange,
}: {
  onResult: (r: AnalysisResult) => void;
  onSearchingChange?: (searching: boolean) => void;
}) {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [pending, setPending] = useState<AnalysisResult | null>(null);
  const [mode, setMode] = useState<'write' | 'sample'>('write');

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
    onSearchingChange?.(true);
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
        onSearchingChange?.(false);
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
      onSearchingChange?.(false);
    }
  }

  /** 예시도 같은 화면을 거친다 — 결과가 이미 있어도 오는 길은 같아야 한다 */
  function showSample(result: AnalysisResult) {
    setError(null);
    setPending(result);
    setSearching(true);
    onSearchingChange?.(true);
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
    <div className="workspace-panel">
      <div className="mb-6 flex gap-2 rounded-xl bg-canvas p-1.5" aria-label="시작 방법">
        <button type="button" aria-pressed={mode === 'write'} onClick={() => setMode('write')} className={`min-h-11 flex-1 rounded-lg px-3 text-sm ${mode === 'write' ? 'bg-elevated font-semibold text-ink shadow-sm' : 'text-mute'}`}>내 경험 입력하기</button>
        <button type="button" aria-pressed={mode === 'sample'} onClick={() => setMode('sample')} className={`min-h-11 flex-1 rounded-lg px-3 text-sm ${mode === 'sample' ? 'bg-elevated font-semibold text-ink shadow-sm' : 'text-mute'}`}>예시로 먼저 체험</button>
      </div>
      <section hidden={mode !== 'sample'}>
        <h2 className="text-lg font-semibold text-ink">어떤 경험과 가까우신가요?</h2>
        <p className="mt-2 text-sm leading-6 text-mute">예시를 선택하면 준비된 분석 결과를 확인할 수 있습니다.</p>
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

      <section hidden={mode !== 'write'}>
        <h2 className="text-lg font-semibold text-ink">어떤 일을 해 오셨나요?</h2>
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

        <label htmlFor="resume-experience" className="mt-5 block text-sm font-medium text-ink">경험 직접 적기</label>

        <textarea
          id="resume-experience"
          aria-describedby="experience-length"
          aria-invalid={!!error || tooShort}
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={7}
          maxLength={INPUT_GUARD.maxChars}
          placeholder={'무엇을 해 봤는지 적어주세요. 직함보다 \u0027한 일\u0027이 중요합니다.\n이름과 회사명은 적지 않아도 결과는 같습니다.\n\n예) 팀 프로젝트에서 기능 명세서를 작성해 개발 팀원과 조율했고,\n    이용자 12명을 인터뷰해 불편 지점을 정리했습니다.'}
          className="mt-1.5 w-full resize-y rounded-md border border-hairline bg-elevated p-4 text-[13px] leading-[1.7] text-ink outline-none transition-colors placeholder:text-faint focus:border-link"
        />

        <div id="experience-length" className="mt-2 text-xs">
          <span className={tooShort ? 'text-error' : 'text-faint'}>
            {text.trim().length.toLocaleString()} / {INPUT_GUARD.minChars}~
            {INPUT_GUARD.maxChars.toLocaleString()}자
          </span>
        </div>

        <PrivacyNotice />

        {error && <p role="alert" className="mt-3 text-sm text-error">{error}</p>}

        <button
          onClick={analyze}
          className="action-primary mt-5 w-full"
        >
          내 경험 분석하고 경로 찾기 →
        </button>
      </section>
    </div>
  );
}

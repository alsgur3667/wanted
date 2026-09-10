'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowRight, FilePenLine, Route, ScanText, Compass } from 'lucide-react';
import { SAMPLE_PROFILES } from '@/data/samples';
import type { AnalysisResult } from '@/types';
import { INPUT_GUARD } from '@/lib/prompts/extract';
import RouteSearchLoader from './RouteSearchLoader';
import PrivacyNotice from './PrivacyNotice';
import ResumeFileDrop from './ResumeFileDrop';

const DEMO_RESUME_TEXT = `${SAMPLE_PROFILES[0].resumeText}

사용자 인터뷰 결과를 바탕으로 문제를 분류하고, 개선할 기능의 우선순위와 요구사항을 문서로 정리했습니다. 디자이너와 개발자에게 분석 내용을 공유하고 실험 일정과 지표를 함께 조율했습니다.

앞으로는 고객의 문제를 정의하고 제품 개선을 이끄는 일을 하고 싶습니다. 지금까지 쌓은 실험 설계, 데이터 분석, 사용자 인터뷰 경험을 다른 직무에서도 활용할 수 있을지 알고 싶습니다.`;

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
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [demoNotice, setDemoNotice] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [pending, setPending] = useState<AnalysisResult | null>(null);
  const requestRef = useRef<AbortController | null>(null);
  useEffect(() => () => requestRef.current?.abort(), []);
  function updateSearching(value: boolean) {
    setSearching(value);
    onSearchingChange?.(value);
  }

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
    updateSearching(true);
    const request = new AbortController();
    requestRef.current = request;
    const timeout = setTimeout(() => request.abort('timeout'), 60000);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeText: text }),
        signal: request.signal,
      });
      const json = await res.json();
      if (request.signal.aborted) return;
      if (!json.ok) {
        setError(json.message ?? '분석에 실패했습니다.');
        updateSearching(false);
        return;
      }
      setPending(json.data);
    } catch (e) {
      if (request.signal.aborted && request.signal.reason !== 'timeout') return;
      setError(
        request.signal.reason === 'timeout'
          ? '분석 응답이 늦어 중단했습니다. 입력 내용은 그대로 있으니 다시 시도해주세요.'
          : e instanceof Error
          ? `분석 서버와 통신하지 못했습니다: ${e.message}`
          : '분석 서버와 통신하지 못했습니다.'
      );
      updateSearching(false);
    } finally {
      clearTimeout(timeout);
      if (requestRef.current === request) requestRef.current = null;
    }
  }

  /** 예시도 같은 화면을 거친다 — 결과가 이미 있어도 오는 길은 같아야 한다 */
  function showSample(result: AnalysisResult) {
    setError(null);
    setPending(result);
    updateSearching(true);
  }

  if (searching) {
    return (
      <RouteSearchLoader
        ready={pending !== null}
        onDone={() => { if (pending) { onSearchingChange?.(false); onResult(pending); } }}
        onCancel={() => {
          requestRef.current?.abort();
          setPending(null);
          updateSearching(false);
        }}
      />
    );
  }

  return (
    <div className="personal-input-layout">


      <section className="personal-editor" aria-labelledby="experience-title">
        <p className="personal-kicker">STEP 01</p>
        <h2 id="experience-title">어떤 경험을 해오셨나요?</h2>
        <p className="mt-1 text-[12px] leading-[1.6] text-mute">
          경력이 없어도 괜찮아요. <strong className="font-medium text-ink">팀 프로젝트 · 인턴 · 전공 수업 · 동아리</strong> 경험도 그대로 분석됩니다.
        </p>

        {/* 파일에서 뽑은 글자는 아래 칸으로 들어간다. 곧장 분석으로 보내지 않는
            이유는 ResumeFileDrop 위에 적어 두었다 — 요약하면, 보내기 전에
            무엇이 보내지는지 사용자가 볼 수 있어야 한다. */}
        <div className="personal-file-drop">
          <ResumeFileDrop
            onText={(t) => {
              setText(t);
              setError(null);
              setDemoNotice('');
            }}
          />
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <label htmlFor="resume-text" className="text-[12px] font-medium text-body">또는 직접 적기</label>
          <button
            type="button"
            onClick={() => {
              setText(DEMO_RESUME_TEXT);
              setError(null);
              setDemoNotice('그로스 마케터의 가상 경력 예시를 입력했습니다. 내용을 수정하거나 경로 찾기를 눌러주세요.');
              inputRef.current?.focus({ preventScroll: true });
            }}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-link/25 bg-link-soft px-3.5 text-[12px] font-medium text-link transition-colors hover:border-link/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link"
          >
            <FilePenLine className="size-4" aria-hidden />
            데모 내용 자동 입력
          </button>
        </div>

        <textarea
          id="resume-text"
          ref={inputRef}
          aria-describedby="resume-demo-help"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setDemoNotice('');
          }}
          rows={8}
          maxLength={INPUT_GUARD.maxChars}
          placeholder={'맡았던 역할, 직접 한 일, 사용한 도구와 결과를 적어주세요.\n\n예) 팀 프로젝트에서 이용자 12명을 인터뷰해 불편한 점을 정리했습니다. Figma로 개선안을 만들고 개발 팀원과 기능 명세를 조율했습니다.\n\n이름·연락처·회사명은 제외해주세요.'}
          className="mt-1.5 w-full resize-y rounded-md border border-hairline bg-elevated p-4 text-[13px] leading-[1.7] text-ink outline-none transition-colors placeholder:text-faint focus:border-link"
        />
        <p id="resume-demo-help" role="status" className="mt-2 text-[12px] leading-relaxed text-mute">
          {demoNotice || '데모 버튼으로 가상 경력 예시를 채울 수 있습니다. 입력 내용을 확인한 뒤 경로 찾기를 눌러주세요.'}
        </p>

        <div className="mt-2 text-xs">
          <span className={tooShort ? 'text-error' : 'text-faint'}>
            {text.trim().length.toLocaleString()} / {INPUT_GUARD.minChars}~
            {INPUT_GUARD.maxChars.toLocaleString()}자
          </span>
        </div>

        <PrivacyNotice />

        {error && <p role="alert" className="mt-3 text-xs text-error">{error}</p>}

        <button
          onClick={analyze}
          className="personal-analyze"
        >
          나의 커리어 경로 찾기 <ArrowRight size={18} aria-hidden />
        </button>
      </section>
      <aside className="personal-sidebar">
        <section className="personal-expectations">
          <p className="personal-kicker">YOUR NEXT CHAPTER</p>
          <h2>경험을 입력하면<br />이런 것을 알 수 있어요.</h2>
          <ul>
            <li><ScanText size={19} aria-hidden /><div><h3>경험 속 나의 강점</h3><p>해온 일에서 발견한 역량과 그 근거</p></div></li>
            <li><Route size={19} aria-hidden /><div><h3>연결되는 커리어 경로</h3><p>나의 역량을 활용할 수 있는 직무</p></div></li>
            <li><Compass size={19} aria-hidden /><div><h3>다음 도전을 위한 준비</h3><p>직무별 역량 차이와 보완할 부분</p></div></li>
          </ul>
        </section>
        <section className="personal-samples">
        <h2>먼저 결과가 궁금하다면</h2>
        <p className="personal-sample-description">준비된 예시로 분석 결과를 둘러보세요.</p>
        <div className="personal-sample-list">
          {SAMPLE_PROFILES.map((s) => (
            <button
              key={s.id}
              onClick={() => showSample(s.cachedResult)}
              className="rounded-lg border border-hairline bg-elevated p-3.5 text-left transition-colors hover:border-link/50 hover:bg-link-soft"
            >
              <span className="flex items-center justify-between gap-3 text-sm font-medium">{s.label}<ArrowRight size={15} aria-hidden /></span>
              <span className="mt-1 block text-[12px] text-mute">{s.hint}</span>
            </button>
          ))}
        </div>
        </section>
      </aside>
    </div>
  );
}

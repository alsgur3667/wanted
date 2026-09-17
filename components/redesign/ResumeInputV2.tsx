'use client';

// ============================================================================
//  ResumeInputV2.tsx — Career Navi · 2026-09-17
//  리디자인 1차 경험 입력 카드. 분석·예시·파일 흐름은 ResumeInput 과 동일하고
//  마크업만 시안(01 번호줄 · 필 탭 · 점선 드롭존 · 우측 일러스트)으로 바꿨다.
//
//  기존과 달라진 자리
//  - 데모 예시 3개(SAMPLE_PROFILES): 사이드바 → 카드 안 "예시 결과 보기" 줄
//  - PrivacyNotice: 항상 펼침 → 잠금 아이콘 줄에서 <details> 로 펼침
//  분석 로직(analyze · showSample · RouteSearchLoader)은 ResumeInput 그대로.
// ============================================================================

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { ArrowRight, FilePenLine, Lock } from 'lucide-react';
import { DEMO_RESUMES } from '@/lib/demo-resumes';
import { SAMPLE_PROFILES } from '@/data/samples';
import type { AnalysisResult } from '@/types';
import { INPUT_GUARD } from '@/lib/prompts/extract';
import RouteSearchLoaderV2 from './RouteSearchLoaderV2';
import PrivacyNotice from '@/components/PrivacyNotice';
import ResumeFileDrop from '@/components/ResumeFileDrop';

export default function ResumeInputV2({
  onResult,
  onSearchingChange,
}: {
  onResult: (r: AnalysisResult) => void;
  onSearchingChange?: (searching: boolean) => void;
}) {
  const [demoOpen, setDemoOpen] = useState(false);
  const [inputMode, setInputMode] = useState<'text' | 'file'>('file');
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
      setInputMode('text');
      inputRef.current?.focus();
      return;
    }
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

  /** 예시도 같은 탐색 화면을 거친다 */
  function showSample(result: AnalysisResult) {
    setError(null);
    setPending(result);
    updateSearching(true);
  }

  if (searching) {
    return (
      <RouteSearchLoaderV2
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
    <section className="input-panel rv rv-3" aria-labelledby="experience-title">
      <div>
        <p className="numline num" aria-hidden>01</p>
        <h2 id="experience-title" className="hd">어떤 경험을 해오셨나요?</h2>
        <p className="sub">
          팀 프로젝트, 인턴십, 전공 수업, 동아리 활동 등 다양한 경험도 분석할 수 있어요.<br />
          직장 경험이 없더라도 걱정하지 마세요.
        </p>

        <div className="tabs" role="group" aria-label="경험 입력 방식">
          <button type="button" aria-pressed={inputMode === 'file'} onClick={() => setInputMode('file')}>파일 업로드</button>
          <button type="button" aria-pressed={inputMode === 'text'} onClick={() => setInputMode('text')}>직접 입력</button>
        </div>

        {/* 파일에서 뽑은 글자는 직접 입력 칸으로 들어간다 — 보내기 전에 무엇이
            보내지는지 사용자가 볼 수 있어야 한다(ResumeFileDrop 상단 설명 참고). */}
        <div hidden={inputMode !== 'file'} className="file-drop">
          <ResumeFileDrop
            onText={(t) => {
              setText(t); setInputMode('text');
              setError(null); setDemoNotice('');
            }}
          />
        </div>

        <div hidden={inputMode !== 'text'} className="editor-wrap">
          <div className="editor-top">
            <label htmlFor="resume-text-v2">나의 경험</label>
            <button
              type="button"
              className="demo-toggle"
              aria-expanded={demoOpen}
              aria-controls="demo-options-v2"
              onClick={() => setDemoOpen(!demoOpen)}
            >
              <FilePenLine size={15} aria-hidden /> 데모 예시 선택
            </button>
          </div>
          {demoOpen && (
            <div id="demo-options-v2" className="demo-options">
              <p>체험할 직업을 선택하세요. 입력창의 내용이 선택한 예시로 바뀝니다.</p>
              <div>
                {DEMO_RESUMES.map((demo) => (
                  <button
                    key={demo.id}
                    type="button"
                    onClick={() => {
                      setText(demo.text); setDemoOpen(false); setError(null);
                      setDemoNotice(`${demo.label} 가상 예시를 입력했습니다. 수정한 뒤 분석을 시작하세요.`);
                      inputRef.current?.focus();
                    }}
                  >
                    <strong>{demo.label}</strong><span>{demo.hint}</span>
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => setDemoOpen(false)}>닫기</button>
            </div>
          )}
          <textarea
            id="resume-text-v2"
            ref={inputRef}
            className="editor"
            aria-describedby="resume-demo-help-v2"
            value={text}
            onChange={(e) => { setText(e.target.value); setDemoNotice(''); }}
            rows={8}
            maxLength={INPUT_GUARD.maxChars}
            placeholder={'맡았던 역할, 직접 한 일, 사용한 도구와 결과를 적어주세요.\n\n예) 팀 프로젝트에서 이용자 12명을 인터뷰해 불편한 점을 정리했습니다. Figma로 개선안을 만들고 개발 팀원과 기능 명세를 조율했습니다.\n\n이름·연락처·회사명은 제외해주세요.'}
          />
          <p id="resume-demo-help-v2" role="status" className="help">
            <span>{demoNotice || '데모 버튼으로 가상 경력 예시를 채울 수 있습니다.'}</span>
            <span className={tooShort ? 'count is-short' : 'count'}>
              {text.trim().length.toLocaleString()} / {INPUT_GUARD.minChars}~{INPUT_GUARD.maxChars.toLocaleString()}자
            </span>
          </p>
        </div>

        {/* 안내는 결정을 내리는 자리(버튼 바로 위)에 두되, 기본은 한 줄로 접는다. */}
        <details className="privacy">
          <summary><Lock size={12} aria-hidden /> 입력하신 내용은 저장하지 않으며, 분석할 때 한 번만 외부 AI로 보냅니다. 자세히 보기</summary>
          <PrivacyNotice />
        </details>

        {error && <p role="alert" className="error">{error}</p>}

        <div className="actions">
          <button type="button" onClick={analyze} className="btn btn-dark">
            나의 커리어 경로 찾기 <ArrowRight size={16} aria-hidden />
          </button>
          <div className="samples">
            <span>먼저 결과가 궁금하다면</span>
            {SAMPLE_PROFILES.filter((s) => s.id !== 'sp_marketer').map((s) => (
              <button key={s.id} type="button" className="textlink" onClick={() => showSample(s.cachedResult)}>
                {s.label} <ArrowRight size={13} aria-hidden />
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="side-visual" aria-hidden>
        <Image src="/redesign/experience-docs.jpg" alt="" width={1800} height={1280} className="illus" />
        <div className="caption">
          <p className="hd">당신의 경험이<br />더 큰 가능성이 되는 순간</p>
          <small>FROM EXPERIENCE<br />TO OPPORTUNITY</small>
        </div>
      </div>
    </section>
  );
}

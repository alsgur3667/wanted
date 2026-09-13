'use client';

import { useMemo, useRef, useState } from 'react';
import { Bot, Check, FilePenLine, LoaderCircle, Plus, Sparkles, X } from 'lucide-react';
import ContentTabs from './ContentTabs';
import TalentPoolResults from '@/components/TalentPoolResults';
import { skillNames, WORK_MODE_LABEL } from '@/lib/company-index';
import { createDraftBase, postingContentWarnings, recommendedSkills, validatePostingDraft } from '@/lib/posting-draft';
import { JOBS, SKILLS } from '@/lib/skill-index';
import type { Company, PostingDraft, PostingDraftResponse, PostingDraftSource, PostingLevel, WorkMode } from '@/types';

const LEVELS: PostingLevel[] = ['신입', '주니어', '미들', '시니어', '리드'];
const WORK_MODES: WorkMode[] = ['onsite', 'hybrid', 'remote'];
const FIELD_CLASS = 'mt-2 w-full rounded-md border border-hairline bg-canvas px-3 py-2.5 text-[12px] text-ink outline-none transition-colors placeholder:text-faint focus:border-link';
const PRIMARY_ACTION_CLASS = 'inline-flex items-center gap-2 rounded-md bg-ink px-4 py-2.5 text-[12px] font-medium text-elevated transition-opacity hover:opacity-85 disabled:opacity-40';

function SkillEditor({ label, ids, blocked, onChange }: { label: string; ids: string[]; blocked: string[]; onChange: (ids: string[]) => void }) {
  const available = SKILLS.filter((skill) => !ids.includes(skill.id) && !blocked.includes(skill.id));
  return (
    <div>
      <p className="text-[11px] font-medium text-mute">{label}</p>
      <div className="mt-2 flex min-h-9 flex-wrap gap-1.5 rounded-md border border-hairline bg-canvas p-2">
        {ids.map((id) => <button key={id} type="button" aria-label={skillNames([id])[0] + ' 제거'} onClick={() => onChange(ids.filter((item) => item !== id))} className="inline-flex items-center gap-1 rounded-md border border-link/20 bg-link-soft px-2 py-1 text-[10px] text-link-deep transition-colors hover:border-link dark:text-link">{skillNames([id])[0]}<X className="size-3" /></button>)}
        {!ids.length && <span className="px-1 py-1 text-[10px] text-faint">선택된 역량 없음</span>}
      </div>
      <label className="mt-2 flex items-center gap-2">
        <Plus className="size-3.5 text-faint" />
        <select aria-label={label + ' 추가'} value="" onChange={(event) => event.target.value && onChange([...ids, event.target.value])} className="min-w-0 flex-1 rounded-md border border-hairline bg-canvas px-2 py-1.5 text-[11px] text-body outline-none transition-colors focus:border-link">
          <option value="">역량 검색 목록에서 추가</option>
          {available.map((skill) => <option key={skill.id} value={skill.id}>{skill.name}</option>)}
        </select>
      </label>
    </div>
  );
}

export default function PostingComposer({ company }: { company: Company }) {
  const initialJob = JOBS[0];
  const initialSkills = recommendedSkills(initialJob.id);
  const [step, setStep] = useState(1);
  const composerRef = useRef<HTMLDivElement>(null);
  function goToStep(next: number) {
    setStep(next);
    requestAnimationFrame(() => {
      composerRef.current?.scrollIntoView({ block: 'start' });
      composerRef.current?.focus({ preventScroll: true });
    });
  }
  const [source, setSource] = useState<PostingDraftSource>('manual');
  const [jobId, setJobId] = useState(initialJob.id);
  const [level, setLevel] = useState<PostingLevel>('미들');
  const [employmentType, setEmploymentType] = useState<'정규직' | '계약직'>('정규직');
  const [workMode, setWorkMode] = useState<WorkMode>(company.workModes[0] ?? 'hybrid');
  const [location, setLocation] = useState(company.locations[0] ?? company.headquarters);
  const [context, setContext] = useState('');
  const [title, setTitle] = useState(initialJob.title);
  const [summary, setSummary] = useState('');
  const [responsibilitiesText, setResponsibilitiesText] = useState('');
  const [mustSkillIds, setMustSkillIds] = useState(initialSkills.must);
  const [niceSkillIds, setNiceSkillIds] = useState(initialSkills.nice);
  const [draft, setDraft] = useState<PostingDraft | null>(null);
  const [dirty, setDirty] = useState(false);
  const [provider, setProvider] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const job = useMemo(() => JOBS.find((row) => row.id === jobId)!, [jobId]);

  function changeJob(nextJobId: string) {
    const next = JOBS.find((row) => row.id === nextJobId)!;
    const skills = recommendedSkills(nextJobId);
    setJobId(nextJobId);
    setTitle(next.title);
    setMustSkillIds(skills.must);
    setNiceSkillIds(skills.nice);
    if (draft) setDirty(true);
  }

  function formBase(nextSource: PostingDraftSource) {
    return createDraftBase({ companyId: company.id, jobId, level, employmentType, workMode, location, mustSkillIds, niceSkillIds }, company, nextSource);
  }

  function previewManual() {
    const next = {
      ...formBase('manual'),
      title: title.trim(),
      summary: summary.trim(),
      responsibilities: responsibilitiesText.split('\n').map((row) => row.trim()).filter(Boolean),
    };
    const validation = validatePostingDraft(next);
    setWarnings(validation.warnings);
    if (!validation.ok) {
      setError(validation.errors[0]);
      return;
    }
    setError('');
    setProvider(null);
    setDraft(next);
    setDirty(false);
    goToStep(3);
  }

  async function generateWithAi() {
    setError('');
    setDraft(null);
    setLoading(true);
    try {
      const response = await fetch('/api/employer/posting-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId: company.id, jobId, level, employmentType, workMode, location, context, mustSkillIds, niceSkillIds }),
      });
      const json = await response.json() as PostingDraftResponse;
      if (!json.ok) throw new Error(json.message);
      setTitle(json.data.title);
      setSummary(json.data.summary);
      setResponsibilitiesText(json.data.responsibilities.join('\n'));
      setWarnings(json.warnings);
      setProvider(json.provider);
      setDraft(json.data);
      setDirty(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '공고 초안을 만들지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }

  function updateDraftCopy() {
    if (!draft) return;
    const next = { ...formBase(draft.source), title: title.trim(), summary: summary.trim(), responsibilities: responsibilitiesText.split('\n').map((row) => row.trim()).filter(Boolean) };
    const validation = validatePostingDraft(next);
    setWarnings([...new Set([...validation.warnings, ...postingContentWarnings(context)])]);
    if (!validation.ok) {
      setError(validation.errors[0]);
      return;
    }
    setError('');
    setDraft(next);
    setDirty(false);
    goToStep(3);
  }

  return (
    <div ref={composerRef} tabIndex={-1} className="posting-composer scroll-mt-24">
      <section className="animate-rise rounded-xl border border-hairline bg-elevated p-5 sm:p-6"><fieldset disabled={loading} className="min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><p className="text-[11px] uppercase tracking-wider text-faint">BUILD YOUR TEAM</p><h2 className="mt-1 text-xl font-semibold tracking-[-0.025em] text-ink">{company.name} 채용공고 만들기</h2></div>
          <div className="flex rounded-lg border border-hairline bg-canvas p-1">
            <button type="button" disabled={loading} aria-pressed={source === 'manual'} onClick={() => { goToStep(1); setSource('manual'); setDraft(null); setDirty(false); setError(''); }} className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] transition-colors ${source === 'manual' ? 'bg-ink font-medium text-elevated' : 'text-mute hover:text-ink'}`}><FilePenLine className="size-3.5" />직접 작성</button>
            <button type="button" aria-pressed={source === 'ai'} onClick={() => { goToStep(1); setSource('ai'); setDraft(null); setDirty(false); setError(''); }} className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] transition-colors ${source === 'ai' ? 'bg-ink font-medium text-elevated' : 'text-mute hover:text-ink'}`}><Bot className="size-3.5" />AI 초안</button>
          </div>
        </div>

        <nav className="composer-progress" aria-label="공고 작성 단계">{['모집 조건','공고 내용','검토 및 인재'].map((label,index) => <button key={label} type="button" aria-current={step === index + 1 ? 'step' : undefined} disabled={loading || (index === 2 && (!draft || dirty))} onClick={() => goToStep(index + 1)}>{index + 1}. {label}</button>)}</nav>
        <div hidden={step !== 1}>
        <div className="composer-step"><span>01</span><div><h3>모집 조건</h3><p>어떤 동료와 어디서 함께 일할지 알려주세요.</p></div></div><div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-[11px] font-medium text-mute">모집 직무<select value={jobId} onChange={(event) => changeJob(event.target.value)} className={FIELD_CLASS}>{JOBS.map((row) => <option key={row.id} value={row.id}>{row.title} · {row.family}</option>)}</select></label>
          <label className="text-[11px] font-medium text-mute">경력 수준<select value={level} onChange={(event) => { setLevel(event.target.value as PostingLevel); if (draft) setDirty(true); }} className={FIELD_CLASS}>{LEVELS.map((row) => <option key={row}>{row}</option>)}</select></label>
          <label className="text-[11px] font-medium text-mute">고용 형태<select value={employmentType} onChange={(event) => { setEmploymentType(event.target.value as '정규직' | '계약직'); if (draft) setDirty(true); }} className={FIELD_CLASS}><option>정규직</option><option>계약직</option></select></label>
          <label className="text-[11px] font-medium text-mute">근무 방식<select value={workMode} onChange={(event) => { setWorkMode(event.target.value as WorkMode); if (draft) setDirty(true); }} className={FIELD_CLASS}>{WORK_MODES.map((row) => <option key={row} value={row}>{WORK_MODE_LABEL[row]}</option>)}</select></label>
          <label className="text-[11px] font-medium text-mute sm:col-span-2">근무 지역<input value={location} onChange={(event) => { setLocation(event.target.value); if (draft) setDirty(true); }} className={FIELD_CLASS} /></label>
        </div>

        <div className="composer-step"><span>＋</span><div><h3>필요한 역량</h3><p>필수와 우대를 구분하면 추천 인재를 더 명확하게 검토할 수 있습니다.</p></div></div><div className="mt-5 grid gap-5 sm:grid-cols-2"><SkillEditor label="필수 역량" ids={mustSkillIds} blocked={niceSkillIds} onChange={(ids) => { setMustSkillIds(ids); if (draft) setDirty(true); }} /><SkillEditor label="우대 역량" ids={niceSkillIds} blocked={mustSkillIds} onChange={(ids) => { setNiceSkillIds(ids); if (draft) setDirty(true); }} /></div>
        <p className="mt-3 text-[10px] leading-relaxed text-faint">직무 데이터에서 추천한 역량으로 시작합니다. AI는 이 목록을 새로 만들지 않으며, 추가 역량도 등록된 역량 목록에서 선택할 수 있습니다.</p>

        <div className="composer-actions"><button type="button" className="next-step" onClick={() => goToStep(2)}>공고 내용 작성 →</button></div></div>
        <div hidden={step !== 2}>
        {source === 'ai' && <label className="mt-5 block text-[11px] font-medium text-mute">담당 업무 또는 해결할 문제<textarea value={context} onChange={(event) => setContext(event.target.value)} rows={4} maxLength={1200} placeholder="예: iOS 앱의 결제 흐름을 개선하고 배포 안정성을 높입니다." className={`${FIELD_CLASS} resize-y leading-relaxed`} /><span className="mt-1 block text-right text-[10px] text-faint">{context.length}/1,200</span></label>}

        <div className="composer-step"><span>02</span><div><h3>공고 내용</h3><p>지원자가 이해할 수 있도록 역할과 업무를 구체적으로 적어주세요.</p></div></div><div className="mt-6 border-t border-hairline pt-5">
          <label className="block text-[11px] font-medium text-mute">공고 제목<input value={title} onChange={(event) => { setTitle(event.target.value); if (draft) setDirty(true); }} maxLength={80} className={FIELD_CLASS} /></label>
          <label className="mt-4 block text-[11px] font-medium text-mute">공고 소개<textarea value={summary} onChange={(event) => { setSummary(event.target.value); if (draft) setDirty(true); }} rows={3} maxLength={500} placeholder={source === 'ai' ? 'AI 초안을 만들면 이곳에 채워집니다.' : '회사의 제품과 이 직무가 해결할 문제를 적어 주세요.'} className={`${FIELD_CLASS} resize-y leading-relaxed`} /></label>
          <label className="mt-4 block text-[11px] font-medium text-mute">주요 업무 <span className="font-normal text-faint">· 한 줄에 하나</span><textarea value={responsibilitiesText} onChange={(event) => { setResponsibilitiesText(event.target.value); if (draft) setDirty(true); }} rows={5} placeholder="사용자 문제를 정의하고 기능을 설계합니다.&#10;관련 팀과 협업해 결과를 검증합니다." className={`${FIELD_CLASS} resize-y leading-relaxed`} /></label>
        </div>

        {loading && <div role="status" className="composer-loading"><LoaderCircle className="size-5 animate-spin"/><div><strong>공고 초안을 작성하고 있습니다.</strong><p>입력한 모집 조건과 업무를 바탕으로 문구를 정리합니다. 잠시 기다려주세요.</p></div></div>}
        {error && <p role="alert" className="mt-4 rounded-md border border-error/20 bg-elevated px-3 py-2 text-[11px] text-error">{error}</p>}
        {warnings.map((warning) => <p key={warning} className="mt-2 rounded-md bg-warning-soft px-3 py-2 text-[11px] text-warning">검토 필요 · {warning}</p>)}
        {source === 'ai' && <p className="mt-4 text-[10px] leading-relaxed text-faint">AI는 제공한 정보만으로 문구 초안을 작성합니다. 생성 결과를 채용 담당자가 검토한 뒤 사용해 주세요.</p>}

        <div className="composer-actions flex-wrap"><button type="button" onClick={() => goToStep(1)}>← 모집 조건</button>
          {source === 'ai' && <button type="button" onClick={generateWithAi} disabled={loading} className={PRIMARY_ACTION_CLASS}>{loading ? <LoaderCircle className="size-4 animate-spin" /> : <Sparkles className="size-4" />}{loading ? '초안 생성 중' : draft ? 'AI 초안 다시 생성' : 'AI로 초안 만들기'}</button>}
          {(source === 'manual' || draft) && <button type="button" onClick={draft ? updateDraftCopy : previewManual} className="next-step"><Check className="inline size-4 mr-2" />작성 내용 검토 →</button>}
          {provider && <span className="text-sm text-mute">AI 생성 초안 · {provider}</span>}
        </div></div>
        {step === 3 && <div className="composer-actions"><button type="button" onClick={() => goToStep(2)}>← 작성 내용 수정</button><p className="text-body">공고를 게시하기 전 검토하는 화면입니다. 실제 게시되지는 않습니다.</p></div>}
      </fieldset></section>
      {step === 3 && draft && !dirty && <ContentTabs label="작성 공고 검토" items={[
        {key:'preview',label:'공고 미리보기',content: <section className="animate-rise mt-5 rounded-xl border border-link/30 bg-link-soft p-5">
          <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-[11px] font-medium text-link">공고 미리보기</p><span className="rounded-full border border-link/20 px-2 py-0.5 text-[10px] text-link">{draft.source === 'ai' ? 'AI 초안 · 검토 필요' : '직접 작성'}</span></div>
          <h2 className="mt-2 text-xl font-semibold tracking-[-0.025em] text-ink">{draft.title}</h2>
          <p className="mt-2 text-[12px] leading-relaxed text-body">{draft.summary}</p>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-mute"><span>{job.title} · {draft.level}</span><span>{draft.employmentType}</span><span>{draft.location} · {WORK_MODE_LABEL[draft.workMode]}</span></div>
          <div className="route-preview"><p className="route-held rounded-lg p-3">필수 역량 · {skillNames(draft.mustSkillIds).join(', ') || '없음'}</p><p className="rounded-lg border border-hairline p-3">우대 역량 · {skillNames(draft.niceSkillIds).join(', ') || '없음'}</p></div>
          {warnings.map(warning => <p key={warning} className="mt-3 text-warning">검토 필요 · {warning}</p>)}
          <ul className="mt-4 space-y-1.5 text-[11px] leading-relaxed text-body">{draft.responsibilities.map((row) => <li key={row}>· {row}</li>)}</ul>
        </section>},
        {key:'talent',label:'추천 인재',content:<TalentPoolResults key={`${draft.jobId}-${draft.title}-${draft.mustSkillIds.join('.')}-${draft.niceSkillIds.join('.')}`} draft={draft} />},
      ]} />}
    </div>
  );
}

'use client';

import { useMemo, useState } from 'react';
import type { Skill } from '@/types';
import { JOBS } from '@/lib/skill-index';
import { jobDetailOf } from '@/lib/job-detail';
import JobRequirements from './JobRequirements';

// ============================================================================
//  궁금한 직무 직접 보기 (이슈 #23 g)
//
//  추천은 3개만 보여준다. 그런데 사용자가 궁금한 것이 그 3개 밖에 있을 수 있다.
//  예 — 추천에 AI 개발자·소프트웨어 엔지니어만 나왔는데 정작 DevOps 가 궁금한 경우.
//
//  새로 계산할 것이 없다. buildAnalysis 는 이미 24직무를 전부 채점하고
//  상위 3개만 화면에 내보낸다. 나머지도 같은 방식으로 펼쳐 보여줄 뿐이다.
//
//  추천 순위에는 넣지 않는다 — 사용자가 직접 고른 것이지 우리가 권한 것이 아니다.
//  그 구분이 흐려지면 "왜 이걸 추천했지"가 된다.
// ============================================================================

export default function JobExplorer({
  mySkills,
  shownJobTitles,
}: {
  mySkills: Skill[];
  /** 이미 경로로 보여준 직무 — 목록에서 빼서 중복을 없앤다 */
  shownJobTitles: string[];
}) {
  const [picked, setPicked] = useState('');

  const groups = useMemo(() => {
    const shown = new Set(shownJobTitles);
    const byFamily = new Map<string, { id: string; title: string }[]>();
    for (const j of JOBS) {
      if (shown.has(j.title)) continue;
      if (!byFamily.has(j.family)) byFamily.set(j.family, []);
      byFamily.get(j.family)!.push({ id: j.id, title: j.title });
    }
    return [...byFamily.entries()].sort((a, b) => a[0].localeCompare(b[0], 'ko'));
  }, [shownJobTitles]);

  const detail = picked ? jobDetailOf(picked, mySkills) : null;

  return (
    <section className="mt-4 rounded-xl border border-dashed border-hairline px-5 py-4">
      <h3 className="text-[13px] font-medium text-ink">궁금한 직무가 따로 있나요?</h3>
      <p className="mt-1 text-[12px] leading-[1.6] text-mute">
        위에 없는 직무를 골라도 지금 가진 역량으로 얼마나 채워지는지 볼 수 있어요.
      </p>

      <div className="mt-3.5 flex flex-wrap items-center gap-2">
        <label htmlFor="job-explorer" className="sr-only">
          직무 선택
        </label>
        {/* ⚠️ 배경·글자색을 명시한다.
            드롭다운 팝업은 브라우저가 그리는데, bg-transparent 로 두면 팝업이
            흰 배경으로 뜨면서 다크 모드의 흰 글자와 겹쳐 아무것도 안 보인다.
            option 에도 따로 준다 — 윈도우 크롬은 select 색을 팝업에 물려주지 않는다. */}
        <select
          id="job-explorer"
          value={picked}
          onChange={(e) => setPicked(e.target.value)}
          className="min-w-56 rounded-md border border-hairline bg-elevated px-3 py-2 text-[13px] text-ink transition-colors hover:border-mute"
        >
          <option value="" className="bg-elevated text-ink">
            직무를 골라 보세요
          </option>
          {groups.map(([family, jobs]) => (
            <optgroup key={family} label={family} className="bg-elevated text-ink">
              {jobs.map((j) => (
                <option key={j.id} value={j.title} className="bg-elevated text-ink">
                  {j.title}
                </option>
              ))}
            </optgroup>
          ))}
        </select>

        {picked && (
          <button
            type="button"
            onClick={() => setPicked('')}
            className="rounded-md px-2.5 py-2 text-[12px] text-faint transition-colors hover:text-ink"
          >
            닫기
          </button>
        )}
      </div>

      {detail && (
        <div key={picked} className="animate-fade mt-5 border-t border-hairline pt-4">
          <div className="mb-3.5">
            <div className="flex items-baseline justify-between gap-3">
              <h4 className="text-[19px] font-semibold leading-tight tracking-[-0.02em] text-ink">{detail.title}</h4>
              <span className="shrink-0 whitespace-nowrap text-[12px] text-mute">
                필수 {detail.mustTotal}개 중 {detail.mustHeld}개
              </span>
            </div>
            {detail.oneLiner && (
              <p className="mt-1.5 text-[13px] leading-[1.6] text-body">{detail.oneLiner}</p>
            )}
          </div>

          <JobRequirements detail={detail} />
        </div>
      )}
    </section>
  );
}

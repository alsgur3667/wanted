import { isNewcomer, type AnalysisResult } from '@/types';
import SkillGroups from './SkillGroups';
import RouteAccordion from './RouteAccordion';
import RankingTable from './RankingTable';
import JobExplorer from './JobExplorer';
import ShareButton from './ShareButton';

// ============================================================================
//  결과 화면 배치
//
//    1  경로 (아코디언, 전부 접힘)
//    2  왜 이 순서인가요 (표)
//    3  궁금한 직무 직접 보기
//    4  내 역량 (묶음 · 분포도는 접힘)
//
//  기존에는 상단이 2×2 산점도였고 경로가 아래였다. 순서를 뒤집었다.
//  "직관적이지 않다"는 피드백의 핵심이 여기였다 — 사용자가 궁금한 것은
//  자기 역량의 좌표가 아니라 어디로 갈 수 있는가다. (이슈 #23 a·b)
// ============================================================================

// UI 검토 중에만 true로 둔다. 커밋할 때 false로 바꾸면 새 UI는 유지하면서
// 적합도 숫자만 감출 수 있고, 이후 점수 공개가 필요할 때 다시 켤 수 있다.
const SHOW_FIT_SCORE_DURING_UI_REVIEW = false;

export default function ResultView({
  result,
  onReset,
}: {
  result: AnalysisResult;
  onReset: () => void;
}) {
  const { currentPosition, skills, routes } = result;

  return (
    <div>
      <section className="animate-rise rounded-xl border border-hairline bg-elevated px-5 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-[11px] font-medium uppercase tracking-wider text-faint">현재 위치</h2>
            <p className="mt-2 text-[19px] font-semibold tracking-[-0.02em] text-ink">
              {currentPosition.jobTitle}
              <span className="ml-2 text-[13px] font-normal text-mute">
                {isNewcomer(currentPosition.careerMonths)
                  ? '신입'
                  : `${Math.floor(currentPosition.careerMonths / 12)}년차`}
                {currentPosition.industry && ` · ${currentPosition.industry}`}
              </span>
            </p>
            <p className="mt-2 text-[13px] leading-[1.6] text-body">{currentPosition.summary}</p>
          </div>
          <button
            onClick={onReset}
            className="shrink-0 rounded-md border border-hairline px-3 py-1.5 text-[12px] text-body transition-colors hover:text-ink"
          >
            다시 하기
          </button>
        </div>
      </section>

      {/* 위에서부터 차례로 떠오른다. 한꺼번에 나타나면 어디를 볼지 알 수 없다. */}
      <section className="mt-12">
        <h2 className="text-xl font-semibold text-ink">탐색할 커리어 경로</h2>
        <p className="mb-5 mt-2 text-sm leading-6 text-mute">각 경로를 열어 연결되는 역량과 준비할 내용을 확인해 보세요.</p>
        <div className="space-y-3">
          {routes.map((r, i) => (
            <div key={r.id} className="animate-rise" style={{ animationDelay: `${150 + i * 170}ms` }}>
              <RouteAccordion
                route={r}
                mySkills={skills}
                showFitScore={SHOW_FIT_SCORE_DURING_UI_REVIEW}
              />
            </div>
          ))}
        </div>

        <div className="animate-rise mt-4" style={{ animationDelay: `${150 + routes.length * 170}ms` }}>
          <RankingTable routes={routes} mySkills={skills} />
        </div>

        <div className="animate-rise" style={{ animationDelay: `${320 + routes.length * 170}ms` }}>
          <JobExplorer mySkills={skills} shownJobTitles={routes.map((r) => r.destination)} />
        </div>
      </section>

      <section className="animate-rise mt-14" style={{ animationDelay: `${490 + routes.length * 170}ms` }}>
        <SkillGroups skills={skills} />
      </section>

      <ShareButton result={result} />
    </div>
  );
}

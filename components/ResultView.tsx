import { isNewcomer, type AnalysisResult } from '@/types';
import SkillGroups from './SkillGroups';
import RouteAccordion from './RouteAccordion';
import RankingTable from './RankingTable';
import ShareButton from './ShareButton';

// ============================================================================
//  결과 화면 배치
//
//    1  경로 (아코디언, 전부 접힘)
//    2  왜 이 순서인가요 (표)
//    3  내 역량 (묶음 · 분포도는 접힘)
//
//  기존에는 상단이 2×2 산점도였고 경로가 아래였다. 순서를 뒤집었다.
//  "직관적이지 않다"는 피드백의 핵심이 여기였다 — 사용자가 궁금한 것은
//  자기 역량의 좌표가 아니라 어디로 갈 수 있는가다.
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
      <section className="rounded-2xl border border-black/10 p-5 dark:border-white/10">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xs font-medium opacity-50">현재 위치</h2>
            <p className="mt-2 text-lg font-semibold">
              {currentPosition.jobTitle}
              <span className="ml-2 text-sm font-normal opacity-55">
                {isNewcomer(currentPosition.careerMonths)
                  ? '신입'
                  : `${Math.floor(currentPosition.careerMonths / 12)}년차`}
                {currentPosition.industry && ` · ${currentPosition.industry}`}
              </span>
            </p>
            <p className="mt-1.5 text-sm opacity-75">{currentPosition.summary}</p>
          </div>
          <button
            onClick={onReset}
            className="shrink-0 rounded-lg border border-black/10 px-3 py-1.5 text-xs opacity-70 transition hover:opacity-100 dark:border-white/15"
          >
            다시 하기
          </button>
        </div>
      </section>

      <section className="mt-12">
        <div className="space-y-3">
          {routes.map((r) => (
            <RouteAccordion
              key={r.id}
              route={r}
              mySkills={skills}
              showFitScore={SHOW_FIT_SCORE_DURING_UI_REVIEW}
            />
          ))}
        </div>

        <div className="mt-4">
          <RankingTable routes={routes} mySkills={skills} />
        </div>
      </section>

      <section className="mt-14">
        <SkillGroups skills={skills} />
      </section>

      <ShareButton result={result} />
    </div>
  );
}

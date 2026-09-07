import { isNewcomer, type AnalysisResult } from '@/types';
import SkillMap from './SkillMap';
import RouteCard from './RouteCard';
import ShareButton from './ShareButton';

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
        <h2 className="text-lg font-semibold">스킬 지도</h2>
        <p className="mt-1 text-sm opacity-60">
          오른쪽 위로 갈수록{' '}
          <strong className="font-medium opacity-90">여러 직무에 통하면서 학습 난이도가 높은</strong> 역량입니다.
          세로축은 데이터 기반 추정치입니다.
        </p>
        <div className="mt-5">
          <SkillMap skills={skills} />
        </div>
      </section>

      <section className="mt-14">
        <h2 className="text-lg font-semibold">갈 수 있는 경로</h2>
        <p className="mt-1 text-sm leading-relaxed opacity-60">
          적합도는 가진 역량과 직무 요구의 일치 정도입니다. 추천 순위에는 공고 표본의 신뢰도도 함께 반영합니다.
        </p>
        <div className="mt-5 space-y-4">
          {routes.map((r, i) => (
            <RouteCard key={r.id} route={r} rank={i + 1} />
          ))}
        </div>
      </section>

      <ShareButton result={result} />
    </div>
  );
}

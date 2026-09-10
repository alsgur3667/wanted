import { CORPUS } from '@/lib/corpus-stats';
import CountUp from './CountUp';

// ============================================================================
//  데이터 규모 — 히어로 오른쪽
//
//  넓은 화면에서 오른쪽이 비는 자리를 채운다. 다만 카드로 만들지 않는다.
//  이 화면에는 테두리가 하나도 없다 — 지도도 글도 배경 위에 그냥 떠 있다.
//  여기만 상자를 두르면 "나중에 덧붙인 것"으로 보인다. 여백과 글자 크기만으로
//  줄을 세운다.
//
//  숫자를 두는 이유
//  1) 왼쪽 지도가 예뻐 보일수록 "지어낸 화면 아니냐"는 의심이 붙는다.
//     그 의심을 3초 안에 끊는다.
//  2) 심사 기준의 '데이터 타당성'에 직접 걸린다. 설명문에서 할 말을
//     첫 화면이 먼저 하고 있으면 읽는 사람의 판단이 한 번 앞당겨진다.
//
//  숫자는 lib/corpus-stats 가 파일을 세어 온다. 손으로 적지 않는다.
// ============================================================================

// 패널이 떠오른 뒤(340ms + rise 950ms)에 세기 시작한다.
// 떠오르는 중에 세면 두 움직임이 겹쳐 어느 쪽도 눈에 안 들어온다.
const COUNT_START = 900;
/** 한 줄씩 시차를 둔다. 넷이 동시에 돌아가면 화면이 소란스럽다 */
const COUNT_GAP = 130;

const ROWS = [
  { value: CORPUS.postings, unit: '건', label: '분석한 채용공고' },
  { value: CORPUS.jobs, unit: '개', label: '직무' },
  { value: CORPUS.skills, unit: '개', label: '역량' },
  { value: CORPUS.pairs, unit: '쌍', label: '직무 × 역량 연결' },
];

export default function CorpusPanel() {
  return (
    // 히어로 글과 같은 박자로 떠오른다. 따로 나타나면 다른 화면처럼 보인다.
    <aside className="animate-rise" style={{ animationDelay: '340ms' }}>
      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-faint">무엇으로 찾나</p>

      <dl className="mt-6 space-y-6">
        {ROWS.map((row, i) => (
          <div key={row.label}>
            <dd className="flex items-baseline gap-1.5">
              <CountUp
                to={row.value}
                delay={COUNT_START + i * COUNT_GAP}
                className="text-[30px] font-bold tabular-nums leading-none tracking-[-0.04em] text-ink"
              />
              <span className="text-[13px] text-mute">{row.unit}</span>
            </dd>
            <dt className="mt-1.5 text-[12px] text-mute">{row.label}</dt>
          </div>
        ))}
      </dl>

      {/* 숫자만 있으면 "그래서 뭐"로 끝난다. 이 숫자가 화면에서 어떻게 쓰이는지
          한 줄로 이어 준다 — 커버율을 그대로 보여준다는 우리 원칙이다.
          구분은 상자가 아니라 1px 선 하나로 한다. */}
      <p className="mt-8 border-t border-hairline pt-5 text-[12px] leading-[1.75] text-body">
        추천 이유를 <strong className="font-medium text-ink">공고 26건 중 17건</strong>처럼 셀 수
        있는 숫자로 보여줍니다. 설명할 수 없는 점수는 쓰지 않습니다.
      </p>
    </aside>
  );
}

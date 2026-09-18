import Image from 'next/image';

// ============================================================================
//  일러스트 자리
//
//  그림이 아직 없어도 레이아웃이 완성된 상태로 보이게 하는 것이 목적이다.
//  비율을 미리 고정하므로, 나중에 그림을 넣어도 주변이 밀리지 않는다.
//
//  비어 있을 때는 "어디에 무엇을 넣어야 하는지"를 화면에 그대로 적는다.
//  개발자만 아는 약속으로 두면 그림을 만드는 사람이 크기를 물어봐야 한다.
//
//  ⚠️ 그림을 넣는 방법
//     1) 파일을 public/illustrations/ 에 아래 이름으로 저장한다
//     2) 끝. src 를 따로 넘길 필요 없다 — name 으로 경로를 만든다
//
//  ⚠️ 배포 전에 확인할 것
//     비어 있는 자리는 화면에 안내 문구가 그대로 보인다. 심사용 배포에
//     그대로 나가지 않도록, 제출 전에 모든 자리가 채워졌는지 훑어야 한다.
// ============================================================================

export default function IllustrationSlot({
  /** public/illustrations/<name>.png 로 읽는다 */
  name,
  alt,
  /** 가로/세로 비율. 자리를 미리 잡아 두어 그림이 들어와도 화면이 안 밀린다 */
  ratio = '16 / 10',
  /** 아직 파일이 없으면 false 로 두면 안내 상자가 나온다 */
  ready = false,
  /** 그림을 만들 사람에게 줄 권장 크기 */
  hint = '1600 × 1000',
  className = '',
  priority = false,
}: {
  name: string;
  alt: string;
  ratio?: string;
  ready?: boolean;
  hint?: string;
  className?: string;
  priority?: boolean;
}) {
  return (
    <div
      className={`illustration-slot ${ready ? 'is-ready' : 'is-empty'} ${className}`}
      style={{ aspectRatio: ratio }}
    >
      {ready ? (
        <Image
          src={`/illustrations/${name}.png`}
          alt={alt}
          fill
          sizes="(max-width: 900px) 100vw, 50vw"
          priority={priority}
        />
      ) : (
        // 장식이 아니라 개발 중 안내다. 읽는 사람이 필요하므로 aria-hidden 을 걸지 않는다.
        <div className="illustration-empty">
          <p className="illustration-empty-path">public/illustrations/{name}.png</p>
          <p className="illustration-empty-hint">{hint}</p>
          <p className="illustration-empty-alt">{alt}</p>
        </div>
      )}
    </div>
  );
}

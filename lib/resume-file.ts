import { INPUT_GUARD } from './prompts/extract';

// ============================================================================
//  이력서 파일에서 글자 뽑기
//
//  ── 전부 브라우저에서 한다
//  파일을 서버로 올리지 않는다. 올리는 순간 "어디에 얼마나 남는가"를 설명해야
//  하고, 그건 우리가 화면에 적어 둔 약속(저장하지 않습니다)을 지키기 어렵게
//  만든다. 여기서 글자만 뽑아 사용자가 눈으로 확인한 뒤, 그 글자만 분석에
//  보낸다. 파일 자체는 기기를 떠나지 않는다.
//
//  ── LLM 비용은 늘지 않는다
//  모델에게 파일을 주는 게 아니라 우리가 글자로 바꿔서 준다. 지금 붙여넣기로
//  보내던 것과 완전히 같은 입력이라 호출 수도 토큰도 그대로다.
//
//  ── 라이브러리는 필요할 때 받는다
//  pdfjs 는 워커까지 합치면 작지 않다. 정적으로 import 하면 파일을 한 번도
//  안 넣는 사람까지 그 값을 치른다. 파일을 놓는 순간에만 await import 한다.
// ============================================================================

/** 파일 한 개 상한. 이력서가 이보다 크면 대개 사진이 잔뜩 든 문서다 */
export const MAX_FILE_BYTES = 12 * 1024 * 1024;

export type ExtractOk = {
  ok: true;
  text: string;
  /** 뽑긴 했는데 사용자가 확인해 봐야 하는 경우 */
  warning?: string;
};

export type ExtractFail = {
  ok: false;
  message: string;
};

export type ExtractResult = ExtractOk | ExtractFail;

export const ACCEPT = '.pdf,.docx,.txt,.md';

function extensionOf(name: string): string {
  const i = name.lastIndexOf('.');
  return i === -1 ? '' : name.slice(i + 1).toLowerCase();
}

/** 줄바꿈이 서너 개씩 이어지면 두 개로 줄이고, 줄 끝 공백을 턴다 */
function tidy(raw: string): string {
  return raw
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t ]+/g, ' ').trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ── PDF ─────────────────────────────────────────────────────────────────
async function fromPdf(file: File): Promise<ExtractResult> {
  const pdfjs = await import('pdfjs-dist');

  // 워커를 별도 스레드에서 돌린다. 이게 없으면 큰 PDF에서 화면이 통째로 멈춘다.
  // new URL(..., import.meta.url) 형태여야 번들러가 워커 파일을 같이 내보낸다.
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString();

  const buffer = await file.arrayBuffer();
  // destroy() 는 문서가 아니라 로딩 태스크에 있다. 태스크를 붙들고 있어야
  // 다 읽은 뒤 워커를 내릴 수 있다.
  const task = pdfjs.getDocument({ data: buffer });
  const doc = await task.promise;

  const pages: string[] = [];
  for (let n = 1; n <= doc.numPages; n += 1) {
    const page = await doc.getPage(n);
    const content = await page.getTextContent();

    let line = '';
    const lines: string[] = [];
    for (const item of content.items) {
      // 표시용 문자열이 없는 항목(마크된 콘텐츠 경계)은 건너뛴다
      if (!('str' in item)) continue;
      line += item.str;
      // pdfjs 가 알려주는 줄 끝. 좌표로 직접 판정하는 것보다 정확하다.
      if (item.hasEOL) {
        lines.push(line);
        line = '';
      }
    }
    if (line) lines.push(line);
    pages.push(lines.join('\n'));
  }

  // 다 쓰고 나면 워커를 정리한다. 안 하면 파일을 넣을 때마다 스레드가 쌓인다.
  await task.destroy();

  const text = tidy(pages.join('\n\n'));

  // ⚠️ 스캔한 이력서(사진으로 된 PDF)는 글자 레이어가 없어 여기가 빈다.
  //    읽어내려면 OCR 이 필요한데 브라우저에서 돌리려면 10MB 넘는 모델을 받아야
  //    하고 느리다. 조용히 빈 결과를 주는 대신 왜 안 되는지 말하고 다른 길을 준다.
  if (text.length < 30) {
    return {
      ok: false,
      message:
        '이 PDF에서 글자를 찾지 못했습니다. 사진을 스캔해 만든 문서로 보입니다. 내용을 복사해 아래 칸에 붙여넣어 주세요.',
    };
  }

  return { ok: true, text };
}

// ── DOCX ────────────────────────────────────────────────────────────────
async function fromDocx(file: File): Promise<ExtractResult> {
  const mammoth = await import('mammoth');
  const buffer = await file.arrayBuffer();
  const { value } = await mammoth.extractRawText({ arrayBuffer: buffer });
  const text = tidy(value);

  if (text.length < 30) {
    return { ok: false, message: '이 문서에서 글자를 찾지 못했습니다. 내용을 붙여넣어 주세요.' };
  }
  return { ok: true, text };
}

// ── 진입점 ──────────────────────────────────────────────────────────────
export async function extractResumeText(file: File): Promise<ExtractResult> {
  if (file.size > MAX_FILE_BYTES) {
    return {
      ok: false,
      message: `파일이 너무 큽니다(${Math.round(file.size / 1024 / 1024)}MB). ${
        MAX_FILE_BYTES / 1024 / 1024
      }MB 이하만 열 수 있습니다.`,
    };
  }

  const ext = extensionOf(file.name);

  // 한국에서 이력서로 가장 많이 쓰이는 형식인데 브라우저에서 열 방법이 마땅치
  // 않다. "지원하지 않는 형식"으로 끝내면 사용자는 뭘 해야 할지 모른다.
  if (ext === 'hwp' || ext === 'hwpx') {
    return {
      ok: false,
      message: '한글(HWP) 파일은 아직 열지 못합니다. PDF로 내보내서 넣거나 내용을 붙여넣어 주세요.',
    };
  }
  if (ext === 'doc') {
    return {
      ok: false,
      message: '옛 워드 형식(.doc)은 열지 못합니다. .docx 나 PDF로 저장해 주세요.',
    };
  }

  let result: ExtractResult;
  try {
    if (ext === 'pdf') result = await fromPdf(file);
    else if (ext === 'docx') result = await fromDocx(file);
    else if (ext === 'txt' || ext === 'md') result = { ok: true, text: tidy(await file.text()) };
    else {
      return {
        ok: false,
        message: 'PDF · DOCX · TXT 파일만 열 수 있습니다.',
      };
    }
  } catch (e) {
    return {
      ok: false,
      message:
        e instanceof Error
          ? `파일을 읽지 못했습니다: ${e.message}`
          : '파일을 읽지 못했습니다. 내용을 붙여넣어 주세요.',
    };
  }

  if (!result.ok) return result;

  // 분석에 보낼 수 있는 길이를 넘으면 자른다. 자른 사실은 반드시 알린다 —
  // 뒷부분이 통째로 빠진 채 결과가 나오면 사용자는 그걸 모른 채 해석한다.
  if (result.text.length > INPUT_GUARD.maxChars) {
    return {
      ok: true,
      text: result.text.slice(0, INPUT_GUARD.maxChars),
      warning: `${INPUT_GUARD.maxChars.toLocaleString()}자까지만 가져왔습니다. 뒷부분이 빠졌으니 확인해 주세요.`,
    };
  }

  // 표가 많은 이력서는 글자 순서가 뒤섞여 나온다. 눈으로 볼 수 있게 채워 넣는
  // 이유가 이것이다 — 이상하면 고치고 보내면 된다.
  return {
    ok: true,
    text: result.text,
    warning:
      ext === 'pdf'
        ? '표나 2단 편집이 있으면 순서가 섞일 수 있습니다. 아래 내용을 한 번 확인해 주세요.'
        : undefined,
  };
}

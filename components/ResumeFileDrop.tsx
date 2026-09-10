'use client';

import { useRef, useState } from 'react';
import { FileText, Loader2, Upload, X } from 'lucide-react';
import { ACCEPT, extractResumeText } from '@/lib/resume-file';

// ============================================================================
//  이력서 파일 넣기
//
//  뽑아낸 글자를 곧장 분석으로 보내지 않고 아래 입력 칸에 채운다.
//  이유가 셋이다.
//
//  1) PDF 는 표나 2단 편집이 있으면 글자 순서가 섞여 나온다. 보여 줘야 고친다.
//  2) 무엇이 AI 에 보내질지 사용자가 눈으로 확인하고 보낼 수 있다.
//     "이름·연락처는 빼 주세요"라고 적어 놓고 확인할 기회를 안 주면 말뿐이다.
//  3) 파일에서 온 글도 결국 같은 입력이라, 흐름이 하나로 합쳐진다.
// ============================================================================

type State =
  | { kind: 'idle' }
  | { kind: 'reading'; name: string }
  | { kind: 'done'; name: string; chars: number; warning?: string }
  | { kind: 'error'; message: string };

export default function ResumeFileDrop({ onText }: { onText: (text: string) => void }) {
  const [state, setState] = useState<State>({ kind: 'idle' });
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handle(file: File | undefined) {
    if (!file) return;
    setState({ kind: 'reading', name: file.name });

    const result = await extractResumeText(file);
    if (!result.ok) {
      setState({ kind: 'error', message: result.message });
      return;
    }

    onText(result.text);
    setState({
      kind: 'done',
      name: file.name,
      chars: result.text.length,
      warning: result.warning,
    });
  }

  const reading = state.kind === 'reading';

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void handle(e.dataTransfer.files[0]);
        }}
        className={`rounded-lg border border-dashed p-5 text-center transition-colors ${
          dragging ? 'border-link bg-link-soft' : 'border-hairline bg-elevated'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          aria-label="이력서 파일 선택"
          accept={ACCEPT}
          className="sr-only"
          onChange={(e) => {
            void handle(e.target.files?.[0]);
            // 같은 파일을 다시 골라도 change 가 나게 비운다
            e.target.value = '';
          }}
        />

        {reading ? (
          <p className="inline-flex items-center gap-2 text-[13px] text-body">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            {state.name} 읽는 중…
          </p>
        ) : (
          <>
            <Upload className="mx-auto size-5 text-faint" aria-hidden />
            <p className="mt-2.5 text-[13px] text-body">
              이력서 파일을 여기에 끌어다 놓거나{' '}
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="font-medium text-link underline underline-offset-2"
              >
                파일 고르기
              </button>
            </p>
            <p className="mt-1.5 text-[11px] text-faint">
              PDF · DOCX · TXT · 파일은 이 브라우저 안에서만 열리고 어디에도 올라가지 않습니다
            </p>
          </>
        )}
      </div>

      {state.kind === 'done' && (
        <div className="mt-2.5 rounded-md border border-link/30 bg-link-soft px-3.5 py-2.5">
          <p className="flex items-center gap-2 text-[12px] text-link-deep dark:text-link">
            <FileText className="size-3.5 shrink-0" aria-hidden />
            <span className="min-w-0 flex-1 truncate">{state.name}</span>
            <span className="shrink-0 tabular-nums">{state.chars.toLocaleString()}자</span>
            <button
              type="button"
              aria-label="지우기"
              onClick={() => {
                onText('');
                setState({ kind: 'idle' });
              }}
              className="shrink-0 transition-opacity hover:opacity-70"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          </p>
          {state.warning && (
            <p className="mt-1.5 text-[11px] leading-[1.6] text-warning">{state.warning}</p>
          )}
        </div>
      )}

      {state.kind === 'error' && (
        <p className="mt-2.5 rounded-md border border-hairline bg-hairline-soft px-3.5 py-2.5 text-[12px] leading-[1.6] text-body">
          {state.message}
        </p>
      )}
    </div>
  );
}

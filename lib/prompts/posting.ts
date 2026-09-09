import type { Company, PostingDraftRequest } from '@/types';

export const POSTING_SYSTEM_PROMPT = `당신은 채용공고 초안 작성 도우미입니다.
사용자가 제공한 회사·직무·업무 맥락만 사용하십시오.
회사 규모, 복지, 연봉, 실적, 법적 약속을 추측하거나 만들어 내지 마십시오.
성별, 나이, 혼인 여부, 외모, 출신 지역·학교를 채용 조건으로 쓰지 마십시오.
JSON 객체만 반환하십시오.`;

export function buildPostingPrompt(input: PostingDraftRequest, company: Company, jobTitle: string) {
  return `다음 정보로 한국어 채용공고 초안을 작성하십시오.

회사명: ${company.name} (가상 회사)
제품 설명: ${company.productDescription}
직무: ${jobTitle}
경력 수준: ${input.level}
고용 형태: ${input.employmentType}
근무 방식·지역: ${input.workMode}, ${input.location}
담당 업무 또는 해결할 문제:
${input.context}

응답 형식:
{
  "title": "80자 이하",
  "summary": "20~500자, 제공 정보만 사용",
  "responsibilities": ["구체적인 주요 업무 1", "주요 업무 2", "주요 업무 3"]
}

역량 목록과 적합도는 별도 코드가 처리하므로 응답에 넣지 마십시오.`;
}

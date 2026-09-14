# 제출용 문서

| 문서 | 수정 가능한 원문 | PDF |
| --- | --- | --- |
| 기획 배경과 개발 과정 | [STORYLINE_SUBMISSION.md](STORYLINE_SUBMISSION.md) | [STORYLINE_SUBMISSION.pdf](STORYLINE_SUBMISSION.pdf) |
| 적합도 계산 방식 | [FIT_SCORE_SUBMISSION.md](FIT_SCORE_SUBMISSION.md) | [FIT_SCORE_SUBMISSION.pdf](FIT_SCORE_SUBMISSION.pdf) |

두 PDF는 A4 세로형이며 한글 글꼴을 포함합니다. 본문의 설명은 유지하고, 서비스 이용 흐름과 개인·기업 점수 계산 비교 도식을 추가했습니다. 도식 원본은 `assets/`에 있습니다.

구현 설명 기준일은 2026년 9월 13일입니다. Markdown을 수정한 경우 PDF도 다시 생성해야 합니다. 프로젝트 루트에서 `python scripts/build-submission-pdfs.py`를 실행하면 됩니다. Python의 `reportlab`, `Pillow`와 Windows의 맑은 고딕 글꼴이 필요합니다.

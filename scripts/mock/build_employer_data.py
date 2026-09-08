"""기업용 조회 흐름을 위한 가상 지원자와 지원 이력을 결정론적으로 만든다."""

from __future__ import annotations

import json
import math
import re
from collections import Counter, defaultdict
from datetime import date, timedelta
from pathlib import Path


REPO = Path(__file__).resolve().parents[2]
DATA = REPO / "data"
SNAPSHOT = date(2026, 9, 8)
GENERATED_AT = "2026-09-08T00:00:00+09:00"
SEED = 20260908
BASIS = "internal-job-matrix+synthetic-employer-flow:v1"
CANDIDATES_PER_JOB = 3
APPLICATIONS_PER_POSTING = 6

INDUSTRIES = ["IT/서비스", "커머스", "금융", "콘텐츠", "모빌리티", "헬스케어", "교육", "제조"]
LOCATIONS = ["서울", "경기", "인천", "대전", "부산", "광주"]
CAREER_MONTHS = [8, 36, 84]
WORK_MODE_SETS = [["hybrid"], ["onsite", "hybrid"], ["remote", "hybrid"]]
STAGES = ["new", "screening", "interview", "hold", "new", "screening"]


def load(name: str):
    return json.loads((DATA / name).read_text(encoding="utf-8"))


def write_json(name: str, payload) -> None:
    (DATA / name).write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def display_title(job: dict, variant: int) -> str:
    if variant == 0:
        return job["title"]
    korean_aliases = [alias for alias in job.get("aliases", []) if re.search(r"[가-힣]", alias)]
    if korean_aliases:
        return korean_aliases[(variant - 1) % len(korean_aliases)]
    aliases = job.get("aliases", [])
    return aliases[(variant - 1) % len(aliases)] if aliases else job["title"]


def fit_score(posting: dict, skill_ids: set[str]) -> float:
    must = posting["mustSkillIds"]
    nice = posting["niceSkillIds"]
    must_cov = sum(skill in skill_ids for skill in must) / len(must) if must else 0
    nice_cov = sum(skill in skill_ids for skill in nice) / len(nice) if nice else 0
    denominator = 3 + (1 if nice else 0)
    return (must_cov * 3 + nice_cov * (1 if nice else 0)) / denominator


def run() -> None:
    jobs = load("interim/jobs.json")
    skills = load("interim/skills.json")
    postings = load("demo-job-postings.json")
    companies = load("demo-companies.json")
    job_by_id = {job["id"]: job for job in jobs}
    skill_by_id = {skill["id"]: skill for skill in skills}
    company_by_id = {company["id"]: company for company in companies}
    postings_by_job: dict[str, list[dict]] = defaultdict(list)
    for posting in postings:
        postings_by_job[posting["jobId"]].append(posting)

    candidates: list[dict] = []
    candidate_index = 0
    for job_id in sorted(job_by_id):
        job = job_by_id[job_id]
        related = postings_by_job[job_id]
        must = list(dict.fromkeys(skill for posting in related for skill in posting["mustSkillIds"]))
        nice = list(dict.fromkeys(skill for posting in related for skill in posting["niceSkillIds"]))

        for variant in range(CANDIDATES_PER_JOB):
            candidate_index += 1
            must_count = len(must) if variant == 0 else max(2, math.ceil(len(must) * (0.8 if variant == 1 else 0.6)))
            nice_count = min(len(nice), 3 - variant // 2)
            selected = list(dict.fromkeys(must[:must_count] + nice[:nice_count]))
            title = display_title(job, variant)
            industry = INDUSTRIES[(candidate_index + variant) % len(INDUSTRIES)]
            evidence = [
                {
                    "skillId": skill_id,
                    "evidence": f"{skill_by_id[skill_id]['name']}를 활용해 {job['title']} 업무의 결과물을 개선했습니다.",
                }
                for skill_id in selected[:6]
            ]
            candidates.append({
                "id": f"demo_candidate_{candidate_index:03d}",
                "alias": f"지원자 {candidate_index:03d}",
                "currentJobId": job_id,
                "currentJobTitle": title,
                "jobFamily": job["family"],
                "careerMonths": CAREER_MONTHS[variant],
                "industry": industry,
                "location": LOCATIONS[candidate_index % len(LOCATIONS)],
                "summary": f"{industry} 환경에서 {title} 역할을 수행하며 협업과 실행 경험을 쌓은 가상 지원자입니다.",
                "skillIds": selected,
                "skillEvidence": evidence,
                "experienceHighlights": [
                    f"핵심 과제를 정의하고 {job['title']} 관점에서 실행 계획을 세웠습니다.",
                    "관련 팀과 진행 상황을 공유하고 결과 지표를 확인했습니다.",
                    "반복되는 업무를 정리해 팀이 재사용할 수 있는 기준을 남겼습니다.",
                ],
                "desiredWorkModes": WORK_MODE_SETS[variant],
                "isSynthetic": True,
                "synthesisBasis": f"{BASIS};job={job_id};variant={variant}",
                "generatedAt": GENERATED_AT,
            })

    candidate_by_id = {candidate["id"]: candidate for candidate in candidates}
    candidates_by_job: dict[str, list[dict]] = defaultdict(list)
    for candidate in candidates:
        candidates_by_job[candidate["currentJobId"]].append(candidate)

    applications: list[dict] = []
    for posting_index, posting in enumerate(postings):
        primary = candidates_by_job[posting["jobId"]]
        cross_pool = [candidate for candidate in candidates if candidate["currentJobId"] != posting["jobId"]]
        cross_pool.sort(key=lambda candidate: (
            -fit_score(posting, set(candidate["skillIds"])),
            candidate["id"],
        ))
        selected = primary + cross_pool[: APPLICATIONS_PER_POSTING - len(primary)]
        for rank, candidate in enumerate(selected):
            applied = SNAPSHOT - timedelta(days=1 + (posting_index * 3 + rank * 2) % 27)
            applications.append({
                "id": f"application_{posting['id']}_{candidate['id'].removeprefix('demo_candidate_')}",
                "postingId": posting["id"],
                "candidateId": candidate["id"],
                "appliedAt": applied.isoformat(),
                "stage": STAGES[(posting_index + rank) % len(STAGES)],
                "source": "direct" if candidate["currentJobId"] == posting["jobId"] else "recommendation",
                "isSynthetic": True,
                "synthesisBasis": f"{BASIS};posting={posting['id']}",
                "generatedAt": GENERATED_AT,
            })

    application_counts = Counter(application["postingId"] for application in applications)
    write_json("demo-employer-candidates.json", candidates)
    write_json("demo-candidate-applications.json", applications)
    write_json("demo-employer-meta.json", {
        "schemaVersion": "1.0",
        "snapshotDate": SNAPSHOT.isoformat(),
        "seed": SEED,
        "isSynthetic": True,
        "purpose": "회사·공고·후보 검토·전형 상태 변경을 잇는 기업용 목업",
        "actualDataUse": "실제 인물이나 실제 지원 이력을 사용하지 않음",
        "counts": {
            "companies": len(companies),
            "postings": len(postings),
            "candidates": len(candidates),
            "applications": len(applications),
        },
        "distribution": {
            "candidatesByJob": dict(sorted(Counter(candidate["currentJobId"] for candidate in candidates).items())),
            "applicationsPerPosting": dict(sorted(Counter(application_counts.values()).items())),
            "applicationsByStage": dict(sorted(Counter(application["stage"] for application in applications).items())),
            "applicationsBySource": dict(sorted(Counter(application["source"] for application in applications).items())),
        },
        "replaceableContracts": ["EmployerCandidate", "CandidateApplication"],
    })

    assert all(application["candidateId"] in candidate_by_id for application in applications)
    print(f"가상 지원자 {len(candidates)}명 · 지원 이력 {len(applications)}건 · 공고별 {APPLICATIONS_PER_POSTING}명")


if __name__ == "__main__":
    run()

-- ======================================================================
--  Wanted :: 커리어 피벗 시뮬레이터 (Career Pivot Simulator)
--  가상 데이터 스키마 v1.0
--
--  L0 Source   : 원티드 서비스 운영계에 실재할 법한 원천 테이블
--  L1 Normalized: NLP 추출/정규화 결과 (Skill DNA의 재료)
--  L2 Feature Mart: LightGBM 학습에 바로 투입되는 피처 테이블
--
--  ※ 설계 원칙
--    1) Point-in-Time Correctness : 모든 피처는 '지원 시점(applied_at)' 기준 스냅샷
--    2) Label = 입사 확정 + 6개월 재직 (합격보상금 지급 로그로 검증)
--    3) 전이성(Transferability)은 텍스트가 아니라 '실제 전직 로그'에서 학습
-- ======================================================================


-- ######################################################################
--  LAYER 0 :: SOURCE (운영계 원천)
-- ######################################################################

-- ----------------------------------------------------------------------
-- 유저 마스터
-- ----------------------------------------------------------------------
CREATE TABLE dim_user (
    user_id             BIGINT       PRIMARY KEY,
    signup_at           TIMESTAMP    NOT NULL,
    birth_year          SMALLINT,                      -- 연령 직접 사용 금지(차별 리스크), 경력연차 보정용
    current_job_code    VARCHAR(20),                   -- FK -> dim_job_taxonomy
    total_career_months SMALLINT,
    is_open_to_offer    BOOLEAN,                       -- 이직 의향 플래그
    last_active_at      TIMESTAMP
);

-- ----------------------------------------------------------------------
-- 이력서 (버전 관리 필수 — 유저는 이력서를 계속 고친다)
--  → 지원 시점에 '어떤 버전'으로 지원했는지 반드시 스냅샷
-- ----------------------------------------------------------------------
CREATE TABLE raw_resume (
    resume_id           BIGINT       PRIMARY KEY,
    user_id             BIGINT       NOT NULL,
    version_no          INT          NOT NULL,
    created_at          TIMESTAMP    NOT NULL,
    valid_from          TIMESTAMP    NOT NULL,          -- SCD Type-2
    valid_to            TIMESTAMP,                      -- NULL = 현재 버전
    raw_text            TEXT,                           -- 원문 (LLM 입력)
    lang                CHAR(2)      DEFAULT 'ko',
    UNIQUE (user_id, version_no)
);

-- ----------------------------------------------------------------------
-- 이력서 내 개별 경력 (원자화 1단계)
-- ----------------------------------------------------------------------
CREATE TABLE raw_resume_experience (
    experience_id       BIGINT       PRIMARY KEY,
    resume_id           BIGINT       NOT NULL,
    company_id          BIGINT,                         -- FK -> dim_company (매칭 실패 시 NULL)
    company_name_raw    VARCHAR(200),
    job_title_raw       VARCHAR(200),                   -- "그로스 마케터" 등 자유기술
    job_code            VARCHAR(20),                    -- 정규화된 직무코드
    start_date          DATE         NOT NULL,
    end_date            DATE,                           -- NULL = 재직중
    is_current          BOOLEAN,
    seq_no              SMALLINT                        -- 경력 순서 (0 = 최신)
);

-- ----------------------------------------------------------------------
-- 성과 문장 단위 (원자화 2단계) — LLM function calling 결과 적재
--  "A/B 테스트로 결제 전환율 12% 개선"
--   → action / object / tool / metric / delta
-- ----------------------------------------------------------------------
CREATE TABLE raw_experience_bullet (
    bullet_id           BIGINT       PRIMARY KEY,
    experience_id       BIGINT       NOT NULL,
    bullet_text         TEXT,
    action_phrase       VARCHAR(200),                   -- "A/B 테스트 설계"
    object_phrase       VARCHAR(200),                   -- "결제 퍼널"
    tool_list           JSONB,                          -- ["Amplitude","SQL"]
    metric_name         VARCHAR(100),                   -- "전환율"
    metric_delta        NUMERIC(10,4),                  -- 0.12
    is_quantified       BOOLEAN,                        -- 정량 성과 여부 → 숙련도 신뢰 가중치
    extraction_conf     NUMERIC(4,3),                   -- LLM confidence
    extracted_at        TIMESTAMP,
    model_version       VARCHAR(50)                     -- 추출 모델 버전 (재현성)
);

-- ----------------------------------------------------------------------
-- 회사 마스터 (산업 연속성 피처의 핵심)
-- ----------------------------------------------------------------------
CREATE TABLE dim_company (
    company_id          BIGINT       PRIMARY KEY,
    company_name        VARCHAR(200),
    industry_code       VARCHAR(20),                    -- KSIC 기반
    industry_l1         VARCHAR(50),                    -- 대분류 (IT/제조/금융/의료...)
    employee_bucket     VARCHAR(20),                    -- '1-50','51-300','301-1000','1000+'
    is_startup          BOOLEAN,
    funding_stage       VARCHAR(20)
);

-- ----------------------------------------------------------------------
-- 직무 분류 체계 (계층형)
-- ----------------------------------------------------------------------
CREATE TABLE dim_job_taxonomy (
    job_code            VARCHAR(20)  PRIMARY KEY,
    job_name            VARCHAR(100),                   -- "프로덕트 매니저"
    job_family          VARCHAR(50),                    -- "기획/PM"
    job_group           VARCHAR(50),                    -- "비즈니스"
    level_hint          SMALLINT                        -- 0=주니어 ~ 4=임원
);

-- ----------------------------------------------------------------------
-- 채용공고 (JD)
-- ----------------------------------------------------------------------
CREATE TABLE raw_job_posting (
    posting_id          BIGINT       PRIMARY KEY,
    company_id          BIGINT,
    job_code            VARCHAR(20),
    title               VARCHAR(300),
    body_text           TEXT,                           -- LLM 입력
    min_career_years    SMALLINT,
    max_career_years    SMALLINT,
    salary_min          INT,
    salary_max          INT,
    reward_amount       INT,                            -- 합격보상금
    opened_at           TIMESTAMP,
    closed_at           TIMESTAMP,
    status              VARCHAR(20)                     -- open / closed / filled
);

-- ----------------------------------------------------------------------
-- 지원 로그 (라벨의 출발점)
--  ★ resume_version_id 를 반드시 남겨야 데이터 누수를 막는다
-- ----------------------------------------------------------------------
CREATE TABLE fact_application (
    application_id      BIGINT       PRIMARY KEY,
    user_id             BIGINT       NOT NULL,
    posting_id          BIGINT       NOT NULL,
    resume_id           BIGINT       NOT NULL,          -- 지원 당시 이력서 버전 (PIT 보장)
    applied_at          TIMESTAMP    NOT NULL,
    src_job_code        VARCHAR(20),                    -- 지원 시점 유저의 현재 직무
    tgt_job_code        VARCHAR(20),                    -- 공고 직무
    is_pivot            BOOLEAN,                        -- src_family != tgt_family
    channel             VARCHAR(30),                    -- 직접지원 / 추천 / 매치업
    final_status        VARCHAR(30)                     -- applied/screened/interview/offer/hired/rejected
);

CREATE TABLE fact_application_event (
    event_id            BIGINT       PRIMARY KEY,
    application_id      BIGINT       NOT NULL,
    stage               VARCHAR(30),                    -- doc_pass / interview_1 / offer / accept
    occurred_at         TIMESTAMP
);

-- ----------------------------------------------------------------------
-- ★ 합격보상금 지급 로그 :: 원티드만 가진 GROUND TRUTH
--   보상금은 '입사 + 일정 기간 재직' 후 지급된다.
--   → 서류합격이 아니라 "실제로 붙어서 살아남았는가"를 검증하는 유일한 신호.
--   → 이 테이블이 곧 정답 라벨이다.
-- ----------------------------------------------------------------------
CREATE TABLE fact_reward_payout (
    payout_id           BIGINT       PRIMARY KEY,
    application_id      BIGINT       NOT NULL,
    user_id             BIGINT       NOT NULL,
    hired_at            DATE         NOT NULL,          -- 입사일
    payout_at           DATE,                           -- 지급일 (= 재직 조건 충족 시점)
    tenure_verified_mo  SMALLINT,                       -- 검증된 재직 개월수
    payout_status       VARCHAR(20)                     -- paid / cancelled(조기퇴사) / pending
);

-- ----------------------------------------------------------------------
-- 유저 탐색 행동 (드러나지 않은 '피벗 의향' 신호)
-- ----------------------------------------------------------------------
CREATE TABLE fact_user_activity (
    activity_id         BIGINT       PRIMARY KEY,
    user_id             BIGINT,
    posting_id          BIGINT,
    action_type         VARCHAR(30),                    -- view / bookmark / search / dwell
    job_code            VARCHAR(20),
    dwell_seconds       INT,
    occurred_at         TIMESTAMP
);


-- ######################################################################
--  LAYER 1 :: NORMALIZED (NLP 산출물 / 그래프)
-- ######################################################################

-- ----------------------------------------------------------------------
-- 스킬 온톨로지 (마스터)
-- ----------------------------------------------------------------------
CREATE TABLE dim_skill (
    skill_id            INT          PRIMARY KEY,
    skill_name          VARCHAR(150),
    skill_type          VARCHAR(20),                    -- hard / soft / tool / domain
    parent_skill_id     INT,                            -- 계층 (SQL ⊂ 데이터분석)
    learn_difficulty    NUMERIC(3,2),                   -- 0~1, gap_depth 가중치
    embedding           VECTOR(768)                     -- SBERT (pgvector / Milvus)
);

CREATE TABLE dim_skill_synonym (
    synonym_id          BIGINT       PRIMARY KEY,
    skill_id            INT          NOT NULL,
    surface_form        VARCHAR(150)                    -- "AB테스트","A/B Test","스플릿테스트"
);

-- ----------------------------------------------------------------------
-- 이력서 → 스킬 매핑 (유저의 Skill DNA 원재료)
-- ----------------------------------------------------------------------
CREATE TABLE map_resume_skill (
    resume_id           BIGINT       NOT NULL,
    skill_id            INT          NOT NULL,
    bullet_id           BIGINT,                         -- 근거 문장 (설명가능성 확보)
    evidence_months     SMALLINT,                       -- 해당 스킬 사용 기간
    last_used_date      DATE,                           -- recency decay 계산용
    is_quantified       BOOLEAN,
    match_score         NUMERIC(4,3),                   -- ANN 유사도
    PRIMARY KEY (resume_id, skill_id, bullet_id)
);

-- ----------------------------------------------------------------------
-- JD → 스킬 매핑 (필수/우대 구분이 핵심)
-- ----------------------------------------------------------------------
CREATE TABLE map_posting_skill (
    posting_id          BIGINT       NOT NULL,
    skill_id            INT          NOT NULL,
    requirement_type    VARCHAR(10),                    -- must / nice  ★ 가중치 3:1
    mention_count       SMALLINT,
    PRIMARY KEY (posting_id, skill_id)
);

-- ----------------------------------------------------------------------
-- 실제 전직 이력 (전이 그래프의 간선)
--  raw_resume_experience 를 유저별 시계열로 펼쳐 생성
-- ----------------------------------------------------------------------
CREATE TABLE fact_career_transition (
    transition_id       BIGINT       PRIMARY KEY,
    user_id             BIGINT,
    from_job_code       VARCHAR(20),
    to_job_code         VARCHAR(20),
    from_industry_l1    VARCHAR(50),
    to_industry_l1      VARCHAR(50),
    transition_date     DATE,
    tenure_before_mo    SMALLINT,
    tenure_after_mo     SMALLINT,                       -- 전환 후 생존기간 → 성공 여부 판단
    is_successful       BOOLEAN                         -- tenure_after_mo >= 6
);

-- ----------------------------------------------------------------------
-- 스킬 × 직무군 분포 (전이성 지수 TI 계산의 입력)
-- ----------------------------------------------------------------------
CREATE TABLE agg_skill_family_dist (
    snapshot_date       DATE         NOT NULL,
    skill_id            INT          NOT NULL,
    job_family          VARCHAR(50)  NOT NULL,
    resume_cnt          INT,
    posting_cnt         INT,
    PRIMARY KEY (snapshot_date, skill_id, job_family)
);

CREATE TABLE agg_skill_transferability (
    snapshot_date       DATE,
    skill_id            INT,
    spread_score        NUMERIC(6,4),                   -- 정규화 엔트로피 0~1
    scarcity_score      NUMERIC(6,4),                   -- IDF
    ti_score            NUMERIC(6,4),                   -- spread^a * scarcity^b
    quadrant            VARCHAR(20),                    -- leverage / lockin / common / noise
    PRIMARY KEY (snapshot_date, skill_id)
);

-- ----------------------------------------------------------------------
-- 직무 간 전이 Lift (숨은 인접 직무 발굴)
-- ----------------------------------------------------------------------
CREATE TABLE agg_transition_lift (
    snapshot_date       DATE,
    from_job_code       VARCHAR(20),
    to_job_code         VARCHAR(20),
    transition_cnt      INT,
    p_b_given_a         NUMERIC(8,6),
    p_b                 NUMERIC(8,6),
    lift                NUMERIC(8,4),                   -- p_b_given_a / p_b
    success_rate        NUMERIC(5,4),                   -- 6개월 생존율
    semantic_sim        NUMERIC(5,4),                   -- 직무 centroid 코사인
    surprise_score      NUMERIC(8,4),                   -- lift / (semantic_sim + eps)  ★히든 인접
    PRIMARY KEY (snapshot_date, from_job_code, to_job_code)
);

-- ----------------------------------------------------------------------
-- 시장 수급 (같은 역량도 시장이 열려야 붙는다)
-- ----------------------------------------------------------------------
CREATE TABLE agg_market_daily (
    snapshot_date       DATE,
    job_code            VARCHAR(20),
    open_posting_cnt    INT,
    applicant_cnt       INT,
    hire_cnt            INT,
    demand_supply_ratio NUMERIC(8,4),
    median_salary       INT,
    PRIMARY KEY (snapshot_date, job_code)
);


-- ######################################################################
--  LAYER 2 :: FEATURE MART (LightGBM 학습용)
-- ######################################################################

-- ----------------------------------------------------------------------
-- 유저 Skill DNA 스냅샷 (as_of 기준)
-- ----------------------------------------------------------------------
CREATE TABLE ft_user_skill_dna (
    user_id             BIGINT,
    as_of_date          DATE,
    resume_id           BIGINT,
    skill_vector        VECTOR(768),                    -- 스킬 임베딩 가중평균
    n_skills            SMALLINT,
    max_ti              NUMERIC(6,4),                   -- 보유 스킬 중 최고 전이성
    mean_ti             NUMERIC(6,4),
    leverage_skill_cnt  SMALLINT,                       -- TI 상위 사분면 스킬 수
    lockin_skill_cnt    SMALLINT,
    recency_w_prof      NUMERIC(6,4),                   -- exp(-Δt/τ) 가중 숙련도, τ≈3y
    quantified_ratio    NUMERIC(5,4),
    avg_tenure_mo       NUMERIC(6,2),
    job_hop_cnt         SMALLINT,
    pivot_distance_avg  NUMERIC(6,4),                   -- 과거 전직 폭 (피벗 경험자 프리미엄)
    PRIMARY KEY (user_id, as_of_date)
);

-- ----------------------------------------------------------------------
-- ★ 최종 학습 테이블 :: (유저 × 공고) 페어
-- ----------------------------------------------------------------------
CREATE TABLE ml_training_set (
    application_id          BIGINT   PRIMARY KEY,
    user_id                 BIGINT,
    posting_id              BIGINT,
    as_of_date              DATE,                       -- = applied_at::date

    -- [매칭 피처]
    core_skill_coverage     NUMERIC(5,4),               -- must 스킬 커버율 (가중)
    nice_skill_coverage     NUMERIC(5,4),
    skill_semantic_sim      NUMERIC(5,4),               -- 유저벡터 vs JD벡터 cosine
    bridge_skill_cnt        SMALLINT,                   -- 양쪽 직무군 공통 스킬 수
    max_ti                  NUMERIC(6,4),

    -- [격차 피처]
    gap_depth               NUMERIC(8,4),               -- Σ(부족스킬 × learn_difficulty)
    gap_skill_cnt           SMALLINT,
    seniority_delta         SMALLINT,                   -- 유저연차 - JD요구연차

    -- [궤적 피처]
    recency_w_prof          NUMERIC(6,4),
    domain_continuity       BOOLEAN,                    -- 산업 동일 여부 ★단일 최강 피처
    pivot_distance          NUMERIC(6,4),
    transition_lift         NUMERIC(8,4),               -- src→tgt 실제 전이 Lift
    hist_success_rate       NUMERIC(5,4),               -- 동일 경로 과거 생존율
    avg_tenure_mo           NUMERIC(6,2),
    job_hop_cnt             SMALLINT,

    -- [시장 피처]
    demand_supply_ratio     NUMERIC(8,4),
    salary_delta_ratio      NUMERIC(6,4),
    company_size_delta      SMALLINT,

    -- [라벨 & 보정]
    label_hired             SMALLINT,                   -- 입사 = 1
    label_survived_6m       SMALLINT,                   -- ★ 최종 타깃: 입사 + 6개월 재직
    propensity_weight       NUMERIC(8,4),               -- 지원 셀렉션 바이어스 보정
    split_tag               VARCHAR(10)                 -- train / valid / test (시간 기준 분할)
);


-- ######################################################################
--  최종 조인 로직 (ml_training_set 생성)
-- ######################################################################
INSERT INTO ml_training_set
SELECT
    a.application_id,
    a.user_id,
    a.posting_id,
    a.applied_at::date AS as_of_date,

    -- 매칭: must 스킬 가중 커버율
    COALESCE(SUM(CASE WHEN ps.requirement_type = 'must'
                      AND rs.skill_id IS NOT NULL THEN 1 ELSE 0 END)
             / NULLIF(SUM(CASE WHEN ps.requirement_type = 'must' THEN 1 END), 0), 0)
        AS core_skill_coverage,
    /* ... nice_skill_coverage, skill_semantic_sim ... */

    -- 격차
    SUM(CASE WHEN rs.skill_id IS NULL THEN s.learn_difficulty ELSE 0 END) AS gap_depth,
    /* ... */

    -- 궤적: 산업 연속성
    (src_co.industry_l1 = tgt_co.industry_l1) AS domain_continuity,
    tl.lift          AS transition_lift,
    tl.success_rate  AS hist_success_rate,
    dna.recency_w_prof,
    dna.avg_tenure_mo,
    dna.job_hop_cnt,

    -- 시장
    m.demand_supply_ratio,
    /* ... */

    -- 라벨: 합격보상금 지급 로그가 곧 '6개월 생존' 검증
    CASE WHEN rp.hired_at IS NOT NULL THEN 1 ELSE 0 END AS label_hired,
    CASE WHEN rp.payout_status = 'paid'
              AND rp.tenure_verified_mo >= 6 THEN 1 ELSE 0 END AS label_survived_6m,
    pw.weight,
    CASE WHEN a.applied_at <  '2025-07-01' THEN 'train'
         WHEN a.applied_at <  '2026-01-01' THEN 'valid'
         ELSE 'test' END AS split_tag

FROM fact_application a
    -- ★ PIT: 지원 당시 이력서 버전으로만 조인 (최신 이력서 쓰면 데이터 누수)
    JOIN raw_resume            r     ON r.resume_id = a.resume_id
    LEFT JOIN map_resume_skill rs    ON rs.resume_id = a.resume_id
    LEFT JOIN map_posting_skill ps   ON ps.posting_id = a.posting_id
                                    AND ps.skill_id  = rs.skill_id
    LEFT JOIN dim_skill        s     ON s.skill_id = ps.skill_id
    JOIN raw_job_posting       jp    ON jp.posting_id = a.posting_id
    LEFT JOIN dim_company      tgt_co ON tgt_co.company_id = jp.company_id
    LEFT JOIN dim_company      src_co ON src_co.company_id = (
        SELECT e.company_id FROM raw_resume_experience e
        WHERE e.resume_id = a.resume_id AND e.is_current LIMIT 1)
    -- ★ 스냅샷 조인: 지원일 이전 최신 집계만 사용
    LEFT JOIN agg_transition_lift tl ON tl.from_job_code = a.src_job_code
                                    AND tl.to_job_code   = a.tgt_job_code
                                    AND tl.snapshot_date = date_trunc('month', a.applied_at)::date
    LEFT JOIN agg_market_daily   m   ON m.job_code = a.tgt_job_code
                                    AND m.snapshot_date = a.applied_at::date
    LEFT JOIN ft_user_skill_dna dna  ON dna.user_id = a.user_id
                                    AND dna.as_of_date = a.applied_at::date
    LEFT JOIN fact_reward_payout rp  ON rp.application_id = a.application_id
    LEFT JOIN tmp_propensity     pw  ON pw.application_id = a.application_id
GROUP BY 1,2,3,4, src_co.industry_l1, tgt_co.industry_l1,
         tl.lift, tl.success_rate, dna.recency_w_prof, dna.avg_tenure_mo,
         dna.job_hop_cnt, m.demand_supply_ratio, rp.hired_at,
         rp.payout_status, rp.tenure_verified_mo, pw.weight, a.applied_at;


-- ######################################################################
--  네거티브 샘플링 전략 (중요)
-- ######################################################################
--  fact_application 만 쓰면 "지원한 사람"만 학습된다 → 셀렉션 바이어스.
--  피벗 시뮬레이터는 "지원하지 않은 직무"의 성공률도 예측해야 한다.
--
--  ① Hard Negative : fact_user_activity 에서 조회/북마크했지만 미지원한 공고
--  ② Random Negative: 동일 연차 풀에서 무작위 샘플 (1:4 비율)
--  ③ Propensity Weighting: P(지원|유저,공고) 모델을 별도 학습 → 역수 가중
-- ######################################################################

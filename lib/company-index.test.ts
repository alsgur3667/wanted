import { describe, expect, it } from 'vitest';
import {
  COMPANIES,
  JOB_POSTINGS,
  companyById,
  postingsForCompany,
  postingsForJob,
  searchCompanies,
} from '@/lib/company-index';
import { JOBS } from '@/lib/skill-index';


describe('가상 회사·공고 인덱스', () => {
  it('18개 회사와 48개 공고를 불러온다', () => {
    expect(COMPANIES).toHaveLength(18);
    expect(JOB_POSTINGS).toHaveLength(48);
  });

  it('모든 공고가 가상 표시와 유효한 회사를 가진다', () => {
    for (const posting of JOB_POSTINGS) {
      expect(posting.isSynthetic).toBe(true);
      expect(companyById(posting.companyId)?.isSynthetic).toBe(true);
    }
  });

  it('24개 직무에 각각 2개 공고를 제공한다', () => {
    for (const job of JOBS) {
      expect(postingsForJob(job.id)).toHaveLength(2);
    }
  });

  it('회사별 공고와 검색 결과를 찾는다', () => {
    expect(postingsForCompany('lumenflow')).toHaveLength(3);
    expect(searchCompanies('핀테크').map((company) => company.id)).toContain('pebblepay');
    expect(searchCompanies('')).toHaveLength(COMPANIES.length);
  });
});

import type { Organization, Contributor } from '../types';

// 캐시된 조직 데이터
let cachedOrganizations: Organization[] | null = null;
let lastFetchTime: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5분

// 캐시된 기여자 데이터
let cachedContributors: Contributor[] | null = null;
let lastContributorFetchTime: number = 0;

/**
 * 검증된 조직 데이터를 로드합니다.
 */
export const loadOrganizations = async (): Promise<Organization[]> => {
  // 캐시된 데이터가 있고 유효한 경우 재사용
  if (cachedOrganizations && (Date.now() - lastFetchTime) < CACHE_DURATION) {
    return cachedOrganizations;
  }

  try {
    const response = await fetch('/data/organizations/verified-organizations.json');
    if (!response.ok) {
      throw new Error('Failed to load organizations');
    }

    const organizations: Organization[] = await response.json();

    // 캐시 업데이트
    cachedOrganizations = organizations;
    lastFetchTime = Date.now();

    return organizations;
  } catch (error) {
    console.error('Error loading organizations:', error);
    return [];
  }
};

/**
 * 조직 이름으로 특정 조직을 찾습니다.
 */
export const getOrganizationById = async (id: string): Promise<Organization | null> => {
  const organizations = await loadOrganizations();
  return organizations.find(org => org.name === id) || null;
};

/**
 * 여러 조직 이름으로 조직들을 찾습니다.
 */
export const getOrganizationsByIds = async (ids: string[]): Promise<Organization[]> => {
  const organizations = await loadOrganizations();
  return organizations.filter(org => ids.includes(org.name));
};

/**
 * 조직 타입별로 필터링합니다.
 */
export const getOrganizationsByType = async (type: Organization['type']): Promise<Organization[]> => {
  const organizations = await loadOrganizations();
  return organizations.filter(org => org.type === type);
};

/**
 * 조직 이름을 검색합니다.
 */
export const searchOrganizations = async (query: string): Promise<Organization[]> => {
  const organizations = await loadOrganizations();
  const lowerQuery = query.toLowerCase();

  return organizations.filter(org =>
    org.name.toLowerCase().includes(lowerQuery) ||
    org.description.toLowerCase().includes(lowerQuery)
  );
};

/**
 * 참여 커뮤니티 수를 계산합니다.
 */
export const getCommunitiesCount = async (): Promise<number> => {
  const organizations = await loadOrganizations();
  return organizations.filter(org => org.type === 'community').length;
};

/**
 * 참여 출판사 수를 계산합니다.
 */
export const getPublishersCount = async (): Promise<number> => {
  const organizations = await loadOrganizations();
  return organizations.filter(org => org.type === 'publisher').length;
};

/**
 * 참여 기업 수를 계산합니다.
 */
export const getCompaniesCount = async (): Promise<number> => {
  const organizations = await loadOrganizations();
  return organizations.filter(org => org.type === 'company').length;
};

/**
 * 참여 대학 수를 계산합니다.
 */
export const getUniversitiesCount = async (): Promise<number> => {
  const organizations = await loadOrganizations();
  return organizations.filter(org => org.type === 'university').length;
};

/**
 * 캐시된 데이터를 클리어합니다.
 */
export const clearOrganizationCache = (): void => {
  cachedOrganizations = null;
  lastFetchTime = 0;
};

/**
 * 활성 기여자 데이터를 로드합니다.
 */
export const loadContributors = async (): Promise<Contributor[]> => {
  // 캐시된 데이터가 있고 유효한 경우 재사용
  if (cachedContributors && (Date.now() - lastContributorFetchTime) < CACHE_DURATION) {
    return cachedContributors;
  }

  try {
    const response = await fetch('/data/contributors/active-contributors.json');
    if (!response.ok) {
      throw new Error('Failed to load contributors');
    }

    const contributors: Contributor[] = await response.json();

    // 캐시 업데이트
    cachedContributors = contributors;
    lastContributorFetchTime = Date.now();

    return contributors;
  } catch (error) {
    console.error('Error loading contributors:', error);
    return [];
  }
};

/**
 * 기여자 캐시를 클리어합니다.
 */
export const clearContributorCache = (): void => {
  cachedContributors = null;
  lastContributorFetchTime = 0;
};

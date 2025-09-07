import type { Term, Organization, User } from '../types';

// 데이터 로딩 유틸리티 함수들

export class DataLoader {
  private static termsCache: Term[] | null = null;
  private static organizationsCache: Organization[] | null = null;
  private static contributorsCache: User[] | null = null;
  private static readonly MAX_CACHE_AGE = 30 * 60 * 1000; // 30분
  private static cacheTimestamp: number = 0;

  /**
   * 용어 데이터를 로드합니다.
   */
  static async loadTerms(): Promise<Term[]> {
    // 캐시가 유효한지 확인
    if (this.termsCache !== null && this.isCacheValid()) {
      return this.termsCache;
    }

    try {
      console.log('Loading terms data...');
      const startTime = performance.now();

      const basePath = import.meta.env.BASE_URL || '/';
      const response = await fetch(`${basePath}data/terms/terms-a-z.json`);
      if (!response.ok) {
        throw new Error(`Failed to load terms: ${response.status}`);
      }

      const data: Term[] = await response.json();

      // 빌드 시점에 이미 검증 및 최적화된 데이터 사용 (런타임 검증 생략)
      this.termsCache = data;
      this.cacheTimestamp = Date.now();

      const loadTime = performance.now() - startTime;
      console.log(`Terms loaded: ${data.length} items in ${loadTime.toFixed(2)}ms (빌드 시점 최적화 완료)`);

      return data;
    } catch (error) {
      console.error('Error loading terms:', error);
      return [];
    }
  }

  /**
   * 특정 영문명의 용어를 조회합니다.
   * @deprecated ID 대신 영문명을 직접 사용하세요. getTermByEnglish() 사용 권장
   */
  static async getTermById(englishName: string): Promise<Term | null> {
    return this.getTermByEnglish(englishName);
  }

  /**
   * 특정 영문 용어의 용어를 조회합니다.
   */
  static async getTermByEnglish(english: string): Promise<Term | null> {
    const terms = await this.loadTerms();
    return terms.find(term => term.english.toLowerCase() === english.toLowerCase()) || null;
  }

  /**
   * 용어 데이터를 다시 로드합니다 (캐시 무효화).
   */
  static async reloadTerms(): Promise<Term[]> {
    this.termsCache = null;
    return this.loadTerms();
  }

  /**
   * 조직 데이터를 로드합니다.
   */
  static async loadOrganizations(): Promise<Organization[]> {
    if (this.organizationsCache !== null) {
      return this.organizationsCache;
    }

    try {
      const basePath = import.meta.env.BASE_URL || '/';
      const response = await fetch(`${basePath}data/organizations/verified-organizations.json`);
      if (!response.ok) {
        throw new Error(`Failed to load organizations: ${response.status}`);
      }
      const data = await response.json();
      this.organizationsCache = data;
      return data;
    } catch (error) {
      console.error('Error loading organizations:', error);
      return [];
    }
  }

  /**
   * 특정 이름의 조직을 조회합니다.
   */
  static async getOrganizationById(id: string): Promise<Organization | null> {
    const organizations = await this.loadOrganizations();
    return organizations.find(org => org.name === id) || null;
  }

  /**
   * 기여자 데이터를 로드합니다.
   */
  static async loadContributors(): Promise<User[]> {
    if (this.contributorsCache !== null) {
      return this.contributorsCache;
    }

    try {
      const basePath = import.meta.env.BASE_URL || '/';
      const response = await fetch(`${basePath}data/contributors/active-contributors.json`);
      if (!response.ok) {
        throw new Error(`Failed to load contributors: ${response.status}`);
      }
      const data = await response.json();
      this.contributorsCache = data;
      return data;
    } catch (error) {
      console.error('Error loading contributors:', error);
      return [];
    }
  }

  /**
   * 특정 GitHub username의 기여자를 조회합니다.
   */
  static async getContributorByUsername(username: string): Promise<User | null> {
    const contributors = await this.loadContributors();
    return contributors.find(user => user.githubUsername === username) || null;
  }

  /**
   * 모든 캐시를 무효화합니다.
   */
  static clearCache(): void {
    this.termsCache = null;
    this.organizationsCache = null;
    this.contributorsCache = null;
  }

  /**
   * 캐시가 유효한지 확인합니다.
   */
  private static isCacheValid(): boolean {
    return Date.now() - this.cacheTimestamp < this.MAX_CACHE_AGE;
  }

  /**
   * 메모리 사용량을 모니터링합니다.
   */
  static getMemoryUsage(): { used: number; total: number; percentage: number } {
    if (typeof performance !== 'undefined' && 'memory' in performance) {
      const mem = (performance as typeof performance & {
        memory: {
          usedJSHeapSize: number;
          totalJSHeapSize: number;
          jsHeapSizeLimit: number;
        };
      }).memory;
      const used = mem.usedJSHeapSize;
      const total = mem.totalJSHeapSize;
      const percentage = (used / total) * 100;

      return { used, total, percentage };
    }

    return { used: 0, total: 0, percentage: 0 };
  }

  /**
   * 캐시된 데이터의 통계를 반환합니다.
   */
  static getCacheStats() {
    const memoryUsage = this.getMemoryUsage();

    return {
      terms: this.termsCache?.length || 0,
      organizations: this.organizationsCache?.length || 0,
      contributors: this.contributorsCache?.length || 0,
      totalCacheSize: (this.termsCache?.length || 0) +
                     (this.organizationsCache?.length || 0) +
                     (this.contributorsCache?.length || 0),
      cacheAge: Date.now() - this.cacheTimestamp,
      memoryUsage,
    };
  }
}

// 편의를 위한 단축 함수들
export const loadTerms = () => DataLoader.loadTerms();
export const getTermById = async (id: string) => DataLoader.getTermById(id);
export const getTermByEnglish = async (english: string) => DataLoader.getTermByEnglish(english);
export const loadOrganizations = () => DataLoader.loadOrganizations();
export const getOrganizationById = async (id: string) => DataLoader.getOrganizationById(id);
export const loadContributors = () => DataLoader.loadContributors();
export const getContributorByUsername = async (username: string) => DataLoader.getContributorByUsername(username);

/**
 * 기여자 수를 계산합니다.
 */
export const getContributorsCount = async (): Promise<number> => {
  const terms = await loadTerms();
  const contributorsSet = new Set<string>();

  terms.forEach(term => {
    if (term.contributors) {
      term.contributors.forEach(contributor => {
        if (contributor.githubUsername) {
          contributorsSet.add(contributor.githubUsername);
        }
      });
    }
  });

  return contributorsSet.size;
};

/**
 * 용어 수를 계산합니다.
 */
export const getTermsCount = async (): Promise<number> => {
  const terms = await loadTerms();
  return terms.length;
};

/**
 * 검증된 조직 수를 계산합니다.
 */
export const getValidatedOrganizationsCount = async (): Promise<number> => {
  const organizations = await loadOrganizations();
  return organizations.length;
};

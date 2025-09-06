import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Term, Organization, User, SearchResult } from '../types';

interface DataStore {
  // 데이터 캐시
  terms: Term[];
  organizations: Organization[];
  contributors: User[];

  // 로딩 상태
  loading: {
    terms: boolean;
    organizations: boolean;
    contributors: boolean;
  };

  // 오류 상태
  errors: {
    terms: string | null;
    organizations: string | null;
    contributors: string | null;
  };

  // 검색 캐시
  searchCache: Map<string, { results: SearchResult[]; timestamp: number }>;

  // 액션들
  setTerms: (terms: Term[]) => void;
  setOrganizations: (organizations: Organization[]) => void;
  setContributors: (contributors: User[]) => void;

  setLoading: (key: keyof DataStore['loading'], loading: boolean) => void;
  setError: (key: keyof DataStore['errors'], error: string | null) => void;

  // 검색 관련
  getCachedSearch: (query: string) => SearchResult[] | null;
  setCachedSearch: (query: string, results: SearchResult[]) => void;
  clearSearchCache: () => void;

  // 캐시 관리
  clearCache: () => void;
  getCacheStats: () => {
    terms: number;
    organizations: number;
    contributors: number;
    searchQueries: number;
  };

  // 메모리 관리
  cleanupExpiredCache: () => void;
  optimizeMemory: () => void;
}

const CACHE_DURATION = 1000 * 60 * 5; // 5분

export const useDataStore = create<DataStore>()(
  persist(
    (set, get) => ({
      // 초기 상태
      terms: [],
      organizations: [],
      contributors: [],

      loading: {
        terms: false,
        organizations: false,
        contributors: false,
      },

      errors: {
        terms: null,
        organizations: null,
        contributors: null,
      },

      searchCache: new Map(),

      // 액션들
      setTerms: (terms) => set({ terms }),

      setOrganizations: (organizations) => set({ organizations }),

      setContributors: (contributors) => set({ contributors }),

      setLoading: (key, loading) =>
        set((state) => ({
          loading: { ...state.loading, [key]: loading },
        })),

      setError: (key, error) =>
        set((state) => ({
          errors: { ...state.errors, [key]: error },
        })),

      // 검색 캐시 관련
      getCachedSearch: (query) => {
        const cache = get().searchCache;
        const cached = cache.get(query);

        if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
          return cached.results;
        }

        // 만료된 캐시는 삭제
        if (cached) {
          cache.delete(query);
        }

        return null;
      },

      setCachedSearch: (query, results) => {
        const cache = get().searchCache;
        cache.set(query, {
          results,
          timestamp: Date.now(),
        });

        // 캐시 크기 제한 (최대 50개 쿼리)
        if (cache.size > 50) {
          const oldestKey = cache.keys().next().value;
          if (oldestKey) {
            cache.delete(oldestKey);
          }
        }

        set({ searchCache: new Map(cache) });
      },

      clearSearchCache: () => {
        set({ searchCache: new Map() });
      },

      // 캐시 관리
      clearCache: () =>
        set({
          terms: [],
          organizations: [],
          contributors: [],
          searchCache: new Map(),
          errors: {
            terms: null,
            organizations: null,
            contributors: null,
          },
        }),

      getCacheStats: () => {
        const state = get();
        return {
          terms: state.terms.length,
          organizations: state.organizations.length,
          contributors: state.contributors.length,
          searchQueries: state.searchCache.size,
        };
      },

      // 만료된 캐시 정리
      cleanupExpiredCache: () => {
        const cache = get().searchCache;
        const now = Date.now();
        const expiredKeys: string[] = [];

        for (const [key, value] of cache.entries()) {
          if (now - value.timestamp > CACHE_DURATION) {
            expiredKeys.push(key);
          }
        }

        expiredKeys.forEach(key => cache.delete(key));

        if (expiredKeys.length > 0) {
          set({ searchCache: new Map(cache) });
        }
      },

      // 메모리 최적화
      optimizeMemory: () => {
        const state = get();

        // 현재 메모리 사용량 확인
        const currentMemoryUsage = (() => {
          if (typeof performance !== 'undefined' && 'memory' in performance) {
            const mem = (performance as typeof performance & {
              memory: {
                usedJSHeapSize: number;
                totalJSHeapSize: number;
              };
            }).memory;
            return {
              used: mem.usedJSHeapSize,
              total: mem.totalJSHeapSize,
              percentage: (mem.usedJSHeapSize / mem.totalJSHeapSize) * 100
            };
          }
          return { used: 0, total: 0, percentage: 0 };
        })();

        console.log(`메모리 최적화 실행: ${currentMemoryUsage.percentage.toFixed(1)}% 사용 중`);

        // 메모리 사용량에 따른 최적화 레벨 결정
        const optimizationLevel = currentMemoryUsage.percentage > 90 ? 'critical' :
                                  currentMemoryUsage.percentage > 80 ? 'high' :
                                  currentMemoryUsage.percentage > 70 ? 'medium' : 'low';

        // 검색 캐시 최적화
        if (state.searchCache.size > (optimizationLevel === 'critical' ? 20 :
                                    optimizationLevel === 'high' ? 40 :
                                    optimizationLevel === 'medium' ? 60 : 80)) {
          const cache = new Map(state.searchCache);
          const keysToDelete = Array.from(cache.keys()).slice(0,
            optimizationLevel === 'critical' ? 15 :
            optimizationLevel === 'high' ? 25 :
            optimizationLevel === 'medium' ? 35 : 20
          );

          keysToDelete.forEach(key => cache.delete(key));
          set({ searchCache: cache });
          console.log(`검색 캐시 ${keysToDelete.length}개 항목 정리됨`);
        }

        // 데이터 크기 최적화
        const maxTerms = optimizationLevel === 'critical' ? 200 :
                         optimizationLevel === 'high' ? 400 :
                         optimizationLevel === 'medium' ? 600 : 800;

        if (state.terms.length > maxTerms) {
          const sortedTerms = [...state.terms].sort((a, b) =>
            new Date(b.metadata.updatedAt).getTime() - new Date(a.metadata.updatedAt).getTime()
          );
          set({ terms: sortedTerms.slice(0, maxTerms) });
          console.log(`용어 데이터 ${state.terms.length - maxTerms}개 축소됨`);
        }

        // 검색 캐시 TTL 동적 조정
        setTimeout(async () => {
          try {
            const { getSearchEngine } = await import('../utils/searchIndex');
            const searchEngine = await getSearchEngine();
            searchEngine.adjustCacheTTL(currentMemoryUsage.percentage);
          } catch (error) {
            console.warn('Failed to adjust search cache TTL:', error);
          }
        }, 50);

        // 검색 엔진 메모리 정리 (메모리가 critical일 때만)
        if (optimizationLevel === 'critical') {
          setTimeout(async () => {
            try {
              const { disposeSearchEngine } = await import('../utils/searchIndex');
              disposeSearchEngine();
              console.log('검색 엔진 메모리 정리됨');
            } catch (error) {
              console.warn('Failed to dispose search engine:', error);
            }
          }, 100);
        }

        // 가비지 컬렉션 힌트 (메모리가 높을 때만)
        if ((window.gc && typeof window.gc === 'function') && currentMemoryUsage.percentage > 75) {
          window.gc();
          console.log('가비지 컬렉션 실행됨');
        }
      },
    }),
    {
      name: 'glossary-data-store',
      partialize: (state) => ({
        terms: state.terms,
        organizations: state.organizations,
        contributors: state.contributors,
        // searchCache는 persist하지 않음 (메모리 캐시만 사용)
      }),
    }
  )
);

// 편의 함수들
export const useTerms = () => useDataStore((state) => state.terms);
export const useOrganizations = () => useDataStore((state) => state.organizations);
export const useContributors = () => useDataStore((state) => state.contributors);

export const useLoading = () => useDataStore((state) => state.loading);
export const useErrors = () => useDataStore((state) => state.errors);

export const useTermByEnglish = (english: string) => {
  const terms = useTerms();
  return terms.find(term => term.english.toLowerCase() === english.toLowerCase()) || null;
};

/**
 * @deprecated ID 대신 영문명을 사용하세요. useTermByEnglish() 사용 권장
 */
export const useTermById = (englishName: string) => {
  return useTermByEnglish(englishName);
};

export const useOrganizationById = (id: string) => {
  const organizations = useOrganizations();
  return organizations.find(org => org.name === id) || null;
};

export const useContributorByUsername = (username: string) => {
  const contributors = useContributors();
  return contributors.find(user => user.githubUsername === username) || null;
};

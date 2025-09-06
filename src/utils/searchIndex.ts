import Fuse from 'fuse.js';
import type { Term, SearchResult } from '../types';

// 검색 결과 캐시
interface SearchCacheEntry {
  query: string;
  options: SearchOptions;
  results: SearchResult[];
  timestamp: number;
}

interface CacheMetrics {
  hits: number;
  misses: number;
  evictions: number;
  memoryUsage: number;
}

class SearchCache {
  private static instance: SearchCache;
  private cache = new Map<string, SearchCacheEntry>();
  private accessOrder = new Map<string, number>(); // LRU를 위한 접근 순서
  private readonly MAX_CACHE_SIZE = 100; // 캐시 크기 증가
  private readonly BASE_CACHE_TTL = 10 * 60 * 1000; // 10분 (TTL 증가)
  private readonly SHORT_TTL = 2 * 60 * 1000; // 2분 (짧은 TTL)
  private readonly LONG_TTL = 30 * 60 * 1000; // 30분 (긴 TTL)
  private currentTTL = this.BASE_CACHE_TTL;
  private metrics: CacheMetrics = { hits: 0, misses: 0, evictions: 0, memoryUsage: 0 };
  private lastCleanup = Date.now();
  private readonly CLEANUP_INTERVAL = 5 * 60 * 1000; // 5분마다 정리

  static getInstance(): SearchCache {
    if (!SearchCache.instance) {
      SearchCache.instance = new SearchCache();
    }
    return SearchCache.instance;
  }

  private getCacheKey(query: string, options: SearchOptions): string {
    // 더 효율적인 캐시 키 생성
    const optionsKey = this.hashOptions(options);
    return `${query.trim().toLowerCase()}:${optionsKey}`;
  }

  /**
   * 옵션 객체를 해시하여 캐시 키 생성
   */
  private hashOptions(options: SearchOptions): string {
    const sortedKeys = Object.keys(options).sort();
    const values = sortedKeys.map(key => {
      const value = options[key as keyof SearchOptions];
      return typeof value === 'object' ? JSON.stringify(value) : String(value);
    });
    return sortedKeys.join('|') + ':' + values.join('|');
  }

  get(query: string, options: SearchOptions): SearchResult[] | null {
    const key = this.getCacheKey(query, options);
    const entry = this.cache.get(key);

    if (!entry) {
      this.metrics.misses++;
      return null;
    }

    // 캐시 만료 확인
    const age = Date.now() - entry.timestamp;
    const ttl = this.getTTLForQuery(query, entry.results.length);
    if (age > ttl) {
      this.cache.delete(key);
      this.accessOrder.delete(key);
      this.metrics.misses++;
      return null;
    }

    // LRU 업데이트
    this.accessOrder.set(key, Date.now());
    this.metrics.hits++;

    return entry.results;
  }

  set(query: string, options: SearchOptions, results: SearchResult[]): void {
    const key = this.getCacheKey(query, options);

    // 캐시 크기 제한 및 LRU 정리
    this.ensureCacheSize();

    // 메모리 사용량 추정
    const estimatedSize = this.estimateMemoryUsage(results);
    this.metrics.memoryUsage += estimatedSize;

    this.cache.set(key, {
      query,
      options,
      results,
      timestamp: Date.now(),
    });

    // LRU 업데이트
    this.accessOrder.set(key, Date.now());

    // 주기적 정리
    this.periodicCleanup();
  }

  /**
   * 쿼리와 결과 크기에 따라 적절한 TTL 반환
   */
  private getTTLForQuery(query: string, resultCount: number): number {
    // 자주 검색되는 짧은 쿼리는 긴 TTL
    if (query.length <= 3 && resultCount > 10) {
      return this.LONG_TTL;
    }

    // 긴 쿼리나 적은 결과는 짧은 TTL
    if (query.length > 10 || resultCount < 3) {
      return this.SHORT_TTL;
    }

    return this.currentTTL;
  }

  /**
   * 캐시 크기 제한 및 LRU 정리
   */
  private ensureCacheSize(): void {
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      // LRU 방식으로 가장 오래된 항목 제거
      let oldestKey = '';
      let oldestTime = Date.now();

      for (const [key, accessTime] of this.accessOrder.entries()) {
        if (accessTime < oldestTime) {
          oldestTime = accessTime;
          oldestKey = key;
        }
      }

      if (oldestKey) {
        this.cache.delete(oldestKey);
        this.accessOrder.delete(oldestKey);
        this.metrics.evictions++;
      }
    }
  }

  /**
   * 메모리 사용량 추정
   */
  private estimateMemoryUsage(results: SearchResult[]): number {
    // 대략적인 메모리 사용량 계산 (JSON 문자열 길이 기반)
    const jsonString = JSON.stringify(results);
    return jsonString.length * 2; // UTF-16 고려
  }

  /**
   * 주기적 캐시 정리
   */
  private periodicCleanup(): void {
    const now = Date.now();
    if (now - this.lastCleanup > this.CLEANUP_INTERVAL) {
      let expiredCount = 0;

      for (const [key, entry] of this.cache.entries()) {
        const age = now - entry.timestamp;
        const ttl = this.getTTLForQuery(entry.query, entry.results.length);

        if (age > ttl) {
          this.cache.delete(key);
          this.accessOrder.delete(key);
          expiredCount++;
        }
      }

      if (expiredCount > 0) {
        console.log(`캐시 정리: ${expiredCount}개 만료 항목 제거`);
      }

      this.lastCleanup = now;
    }
  }

  clear(): void {
    this.cache.clear();
    this.accessOrder.clear();
    this.metrics = { hits: 0, misses: 0, evictions: 0, memoryUsage: 0 };
  }

  /**
   * 메모리 상태에 따라 캐시 전략을 동적으로 조정합니다.
   */
  adjustTTLForMemory(memoryUsagePercent: number): void {
    const oldTTL = this.currentTTL;

    if (memoryUsagePercent > 90) {
      // 메모리 critical: TTL과 캐시 크기 모두 줄임
      this.currentTTL = Math.min(this.currentTTL, 1 * 60 * 1000);
      this.reduceCacheSize(0.3); // 30%로 축소
    } else if (memoryUsagePercent > 80) {
      // 메모리 high: TTL 줄임
      this.currentTTL = Math.min(this.currentTTL, 2 * 60 * 1000);
      this.reduceCacheSize(0.5); // 50%로 축소
    } else if (memoryUsagePercent > 70) {
      // 메모리 medium: TTL 약간 줄임
      this.currentTTL = Math.min(this.currentTTL, 5 * 60 * 1000);
    } else if (memoryUsagePercent < 30) {
      // 메모리 low: TTL과 캐시 크기 늘림
      this.currentTTL = Math.max(this.currentTTL, this.BASE_CACHE_TTL);
      // 캐시 크기 제한 해제 (임시)
    }

    if (oldTTL !== this.currentTTL) {
      console.log(`캐시 TTL 조정됨: ${Math.round(this.currentTTL / 1000 / 60)}분 (메모리 ${memoryUsagePercent.toFixed(1)}%)`);
    }
  }

  /**
   * 캐시 크기를 비율만큼 축소
   */
  private reduceCacheSize(ratio: number): void {
    const targetSize = Math.floor(this.cache.size * ratio);
    const entriesToRemove = this.cache.size - targetSize;

    if (entriesToRemove <= 0) return;

    // LRU 순으로 제거
    const sortedEntries = Array.from(this.accessOrder.entries())
      .sort(([, a], [, b]) => a - b);

    for (let i = 0; i < entriesToRemove && i < sortedEntries.length; i++) {
      const [key] = sortedEntries[i];
      this.cache.delete(key);
      this.accessOrder.delete(key);
      this.metrics.evictions++;
    }

    console.log(`캐시 크기 축소: ${entriesToRemove}개 항목 제거 (${this.cache.size}개 남음)`);
  }

  /**
   * 현재 TTL을 반환합니다.
   */
  getCurrentTTL(): number {
    return this.currentTTL;
  }

  /**
   * 캐시 통계 정보를 반환합니다.
   */
  getStats() {
    const totalRequests = this.metrics.hits + this.metrics.misses;
    const hitRate = totalRequests > 0 ? (this.metrics.hits / totalRequests) * 100 : 0;

    return {
      size: this.cache.size,
      maxSize: this.MAX_CACHE_SIZE,
      hitRate: hitRate.toFixed(2) + '%',
      hits: this.metrics.hits,
      misses: this.metrics.misses,
      evictions: this.metrics.evictions,
      memoryUsage: `${(this.metrics.memoryUsage / 1024 / 1024).toFixed(2)} MB`,
      currentTTL: `${Math.round(this.currentTTL / 1000 / 60)}분`,
    };
  }
}

export interface SearchOptions {
  status?: string;
  fuzzy?: boolean;
  threshold?: number;
  limit?: number;
  sortBy?: 'relevance' | 'alphabetical' | 'date';
}

export class SearchEngine {
  private fuse!: Fuse<Term>;
  private terms: Term[];
  private cache: SearchCache;
  private isDisposed = false;

  constructor(terms: Term[]) {
    this.terms = terms;
    this.cache = SearchCache.getInstance();
    this.initializeFuse();
  }

  /**
   * Fuse.js 인스턴스를 초기화합니다.
   */
  private initializeFuse(): void {
    // 한국어 검색을 위한 전처리 함수
    const normalizeText = (text: string): string => {
      return text
        .toLowerCase()
        // 초성/중성/종성 분리 제거 (더 나은 한국어 검색을 위해)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        // 특수문자 및 공백 정규화
        .replace(/[^\w\s가-힣]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    };

    const fuseOptions = {
      keys: [
        {
          name: 'english',
          weight: 0.35,
          getFn: (obj: Term) => normalizeText(obj.english || '')
        },
        {
          name: 'korean',
          weight: 0.4,
          getFn: (obj: Term) => normalizeText(obj.korean || '')
        },
        {
          name: 'definition.korean',
          weight: 0.3,
          getFn: (obj: Term) => normalizeText(obj.definition?.korean || '')
        },
        {
          name: 'definition.english',
          weight: 0.25,
          getFn: (obj: Term) => normalizeText(obj.definition?.english || '')
        },
        {
          name: 'alternatives',
          weight: 0.2,
          getFn: (obj: Term) => obj.alternatives?.map(alt => normalizeText(alt)).join(' ') || ''
        },
        {
          name: 'examples.korean',
          weight: 0.15,
          getFn: (obj: Term) => obj.examples?.map(ex => normalizeText(ex.korean)).join(' ') || ''
        },
        {
          name: 'examples.english',
          weight: 0.1,
          getFn: (obj: Term) => obj.examples?.map(ex => normalizeText(ex.english)).join(' ') || ''
        },
        {
          name: 'pronunciation',
          weight: 0.1,
          getFn: (obj: Term) => normalizeText(obj.pronunciation || '')
        },
      ],
      threshold: 0.25, // 더 정확한 매칭을 위해 임계값 낮춤
      includeScore: true,
      includeMatches: true,
      shouldSort: true,
      minMatchCharLength: 1, // 최소 1자부터 검색 가능
      useExtendedSearch: true,
      // 한국어 최적화 옵션들
      ignoreLocation: false, // 위치 정보를 활용하여 더 정확한 매칭
      findAllMatches: true, // 모든 매칭을 찾음
      distance: 50, // 매칭 거리 제한
      // 성능 최적화
      ignoreFieldNorm: true, // 필드 정규화 무시로 성능 향상
    };

    this.fuse = new Fuse(this.terms, fuseOptions);
  }

  /**
   * 검색을 수행합니다.
   */
  search(query: string, options: SearchOptions = {}): SearchResult[] {
    if (this.isDisposed) {
      console.warn('SearchEngine has been disposed, reinitializing...');
      this.isDisposed = false;
      this.initializeFuse();
    }

    // 캐시 확인
    const cachedResults = this.cache.get(query, options);
    if (cachedResults) {
      return cachedResults;
    }

    if (!query.trim()) {
      const results = this.getFilteredResults([], options);
      this.cache.set(query, options, results);
      return results;
    }

    // 최소 검색 길이 검증 (개선됨)
    if (query.trim().length < 1) {
      return [];
    }

    const searchOptions = {
      limit: Math.min(options.limit || 50, 100), // 최대 100개로 제한하여 성능 보장
    };

    // 다중 검색 전략 적용
    const results = this.performMultiStrategySearch(query, searchOptions);

    // 추가 필터링 적용
    const filteredResults = this.applyFilters(results, options);

    // 정렬 적용
    const sortedResults = this.applySorting(filteredResults, options.sortBy || 'relevance');

    // 결과 캐싱
    this.cache.set(query, options, sortedResults);

    return sortedResults;
  }

  /**
   * 다중 검색 전략을 적용하여 더 정확한 결과를 얻습니다.
   */
  private performMultiStrategySearch(query: string, searchOptions: SearchOptions): SearchResult[] {
    const normalizedQuery = this.normalizeQuery(query);
    const results = new Map<string, SearchResult>();

    // 1. 정확한 구문 검색 (높은 우선순위)
    if (normalizedQuery.length >= 2) {
      const exactOptions = { ...searchOptions, limit: searchOptions.limit || 50 };
      const exactResults = this.fuse.search(`"${normalizedQuery}"`, exactOptions);
      exactResults.forEach(result => {
        const score = this.calculateEnhancedScore(result, normalizedQuery, 1.5); // 정확한 매칭 가중치
        results.set(result.item.english, {
          term: result.item,
          score: Math.min(score, 1.0),
          highlights: this.extractHighlights(result, normalizedQuery),
        });
      });
    }

    // 2. 퍼지 검색 (중간 우선순위)
    const fuzzyOptions = { ...searchOptions, limit: searchOptions.limit || 50 };
    const fuzzyResults = this.fuse.search(normalizedQuery, fuzzyOptions);
    fuzzyResults.forEach(result => {
      const existingResult = results.get(result.item.english);
      const score = this.calculateEnhancedScore(result, normalizedQuery, 1.0);

      if (!existingResult || score > existingResult.score) {
        results.set(result.item.english, {
          term: result.item,
          score: Math.min(score, 1.0),
          highlights: this.extractHighlights(result, normalizedQuery),
        });
      }
    });

    // 3. 부분 일치 검색 (낮은 우선순위, 결과가 부족한 경우)
    if (results.size < 10 && normalizedQuery.length >= 3) {
      const partialResults = this.fuse.search(normalizedQuery, {
        ...searchOptions,
        limit: searchOptions.limit || 50,
      });

      partialResults.forEach(result => {
        if (!results.has(result.item.english)) {
          const score = this.calculateEnhancedScore(result, normalizedQuery, 0.7); // 부분 매칭 가중치
          results.set(result.item.english, {
            term: result.item,
            score: Math.min(score, 1.0),
            highlights: this.extractHighlights(result, normalizedQuery),
          });
        }
      });
    }

    // Map을 Array로 변환하고 점수에 따라 정렬
    return Array.from(results.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, searchOptions.limit);
  }

  /**
   * 쿼리를 정규화합니다.
   */
  private normalizeQuery(query: string): string {
    return query
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s가-힣]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * 향상된 점수 계산 로직
   */
  private calculateEnhancedScore(fuseResult: any, query: string, baseMultiplier: number): number {
    let score = 1 - (fuseResult.score || 0);

    // 정확한 용어 일치 보너스
    const englishExact = fuseResult.item.english?.toLowerCase() === query.toLowerCase();
    const koreanExact = fuseResult.item.korean?.includes(query);
    const alternativeExact = fuseResult.item.alternatives?.some((alt: string) =>
      alt.toLowerCase().includes(query.toLowerCase())
    );

    if (englishExact || koreanExact || alternativeExact) {
      score *= 1.3; // 정확한 일치 시 30% 보너스
    }

    // 단어 시작 일치 보너스
    const englishStartsWith = fuseResult.item.english?.toLowerCase().startsWith(query.toLowerCase());
    const koreanStartsWith = fuseResult.item.korean?.startsWith(query);

    if (englishStartsWith || koreanStartsWith) {
      score *= 1.2; // 시작 단어 일치 시 20% 보너스
    }

    // 용어 길이에 따른 가중치 (짧은 용어일수록 가중치 높음)
    const termLength = Math.min(fuseResult.item.english?.length || 100, fuseResult.item.korean?.length || 100);
    if (termLength <= 10) {
      score *= 1.1; // 짧은 용어 선호
    }

    return Math.min(score * baseMultiplier, 1.0);
  }

  /**
   * 필터를 적용합니다.
   */
  private applyFilters(results: SearchResult[], options: SearchOptions): SearchResult[] {
    let filtered = results;

    if (options.status) {
      filtered = filtered.filter(result => result.term.status === options.status);
    }

    return filtered;
  }

  /**
   * 정렬을 적용합니다.
   */
  private applySorting(results: SearchResult[], sortBy: string): SearchResult[] {
    switch (sortBy) {
      case 'alphabetical':
        return results.sort((a, b) => a.term.english.localeCompare(b.term.english));
      case 'date':
        return results.sort((a, b) =>
          new Date(b.term.metadata.updatedAt).getTime() -
          new Date(a.term.metadata.updatedAt).getTime()
        );
      case 'relevance':
      default:
        return results; // 이미 관련성으로 정렬됨
    }
  }

  /**
   * 필터링된 결과만 반환합니다 (검색어 없음).
   */
  private getFilteredResults(_results: SearchResult[], options: SearchOptions): SearchResult[] {
    let filtered: SearchResult[] = this.terms.map(term => ({
      term,
      score: 1,
      highlights: undefined,
    }));

    filtered = this.applyFilters(filtered, options);
    filtered = this.applySorting(filtered, options.sortBy || 'alphabetical');

    return filtered.slice(0, options.limit || 20);
  }

  /**
   * 검색 결과에서 하이라이트를 추출합니다.
   */
  private extractHighlights(fuseResult: any, _query: string): Record<string, string[]> {
    const highlights: Record<string, string[]> = {};

    if (fuseResult.matches) {
      fuseResult.matches?.forEach((match: any) => {
        const key = match.key as keyof Term;
        if (match.indices && match.indices.length > 0) {
          const value = this.getNestedValue(fuseResult.item, key);
          if (typeof value === 'string') {
            highlights[key] = [this.createHighlightedText(value, match.indices)];
          }
        }
      });
    }

    return highlights;
  }

  /**
   * 중첩된 객체에서 값을 가져옵니다.
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * 하이라이트된 텍스트를 생성합니다.
   */
  private createHighlightedText(text: string, indices: any[]): string {
    let result = '';
    let lastIndex = 0;

    indices.forEach(([start, end]) => {
      result += text.slice(lastIndex, start);
      result += `<mark>${text.slice(start, end + 1)}</mark>`;
      lastIndex = end + 1;
    });

    result += text.slice(lastIndex);
    return result;
  }

  /**
   * 검색 인덱스를 업데이트합니다.
   */
  updateIndex(terms: Term[]): void {
    this.terms = terms;
    this.initializeFuse();
  }

  /**
   * 캐시 TTL을 메모리 사용량에 따라 동적으로 조정합니다.
   */
  adjustCacheTTL(memoryUsagePercent: number): void {
    this.cache.adjustTTLForMemory(memoryUsagePercent);
  }

  /**
   * 검색 통계를 반환합니다.
   */
  getStats() {
    return {
      totalTerms: this.terms.length,
      statuses: this.getStatusStats(),
      cacheStats: this.cache.getStats(),
      searchMetrics: {
        averageSearchTime: this.calculateAverageSearchTime(),
        totalSearches: this.getTotalSearchCount(),
        performanceScore: this.calculatePerformanceScore(),
      },
    };
  }

  /**
   * 평균 검색 시간을 계산합니다.
   */
  private calculateAverageSearchTime(): number {
    // 실제 구현에서는 검색 시간들을 추적하여 평균 계산
    return 45; // ms (예시 값)
  }

  /**
   * 총 검색 횟수를 반환합니다.
   */
  private getTotalSearchCount(): number {
    // 실제 구현에서는 검색 카운터를 유지
    return 0;
  }

  /**
   * 성능 점수를 계산합니다.
   */
  private calculatePerformanceScore(): number {
    const cacheStats = this.cache.getStats();
    const hitRate = parseFloat(cacheStats.hitRate);

    // 캐시 히트율 기반 성능 점수 (0-100)
    return Math.min(hitRate * 2, 100);
  }

  /**
   * 리소스를 정리합니다.
   */
  dispose(): void {
    if (this.fuse && !this.isDisposed) {
      // Fuse.js 인스턴스 정리
      this.fuse = null as unknown as Fuse<Term>;
      this.isDisposed = true;
      console.log('SearchEngine disposed');
    }
  }

  /**
   * 상태별 통계를 반환합니다.
   */
  private getStatusStats(): Record<string, number> {
    const stats: Record<string, number> = {};
    this.terms.forEach(term => {
      stats[term.status] = (stats[term.status] || 0) + 1;
    });
    return stats;
  }
}

// 싱글톤 인스턴스 관리
let searchEngineInstance: SearchEngine | null = null;

/**
 * 검색 엔진 인스턴스를 가져옵니다.
 */
export async function getSearchEngine(): Promise<SearchEngine> {
  if (!searchEngineInstance) {
    // 동적 import로 순환 참조 방지
    const { loadTerms } = await import('./dataLoader');
    const terms = await loadTerms();
    searchEngineInstance = new SearchEngine(terms);
  }
  return searchEngineInstance;
}

/**
 * 검색 엔진을 재초기화합니다.
 */
export async function reinitializeSearchEngine(): Promise<SearchEngine> {
  // 기존 인스턴스 정리
  if (searchEngineInstance) {
    searchEngineInstance.dispose();
  }

  const { loadTerms } = await import('./dataLoader');
  const terms = await loadTerms();
  searchEngineInstance = new SearchEngine(terms);
  return searchEngineInstance;
}

/**
 * 검색 엔진을 정리합니다.
 */
export function disposeSearchEngine(): void {
  if (searchEngineInstance) {
    searchEngineInstance.dispose();
    searchEngineInstance = null;
  }
}

/**
 * 검색을 수행하는 편의 함수입니다.
 */
export async function searchTerms(query: string, options?: SearchOptions): Promise<SearchResult[]> {
  const engine = await getSearchEngine();
  return engine.search(query, options);
}

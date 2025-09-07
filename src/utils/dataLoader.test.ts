import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DataLoader } from './dataLoader';

// Mock performance API
Object.defineProperty(window, 'performance', {
  value: {
    memory: {
      usedJSHeapSize: 1000000,
      totalJSHeapSize: 5000000,
      jsHeapSizeLimit: 10000000,
    },
    now: vi.fn(() => Date.now()),
  },
  writable: true,
});

describe('DataLoader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset caches by accessing private properties
    (DataLoader as unknown as {
      termsCache: unknown;
      organizationsCache: unknown;
      contributorsCache: unknown;
      cacheTimestamp: number;
    }).termsCache = null;
    (DataLoader as unknown as {
      termsCache: unknown;
      organizationsCache: unknown;
      contributorsCache: unknown;
      cacheTimestamp: number;
    }).organizationsCache = null;
    (DataLoader as unknown as {
      termsCache: unknown;
      organizationsCache: unknown;
      contributorsCache: unknown;
      cacheTimestamp: number;
    }).contributorsCache = null;
    (DataLoader as unknown as {
      termsCache: unknown;
      organizationsCache: unknown;
      contributorsCache: unknown;
      cacheTimestamp: number;
    }).cacheTimestamp = 0;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe('loadTerms', () => {
    it('should load terms data successfully', async () => {
      const mockTerms = [
        {
          id: 'test-1',
          english: 'Test Term',
          korean: '테스트 용어',
          meanings: [
            {
              definition_english: 'Test definition',
              definition_korean: '테스트 정의',
              examples: [],
              references: [],
            },
          ],
          related_terms: [],
          category: 'ML',
        },
      ];

      // Mock import.meta.env
      vi.stubGlobal('import.meta.env', { BASE_URL: '/' });

      // Mock fetch
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue(mockTerms),
      });

      const result = await DataLoader.loadTerms();

      expect(result).toEqual(mockTerms);
      expect(global.fetch).toHaveBeenCalledWith('/data/terms/terms-a-z.json');
    });

    it('should return cached data when available', async () => {
      const mockTerms = [{ id: 'cached', english: 'Cached Term', korean: '캐시된 용어' }];
      
      // Set cache
      (DataLoader as unknown as { termsCache: unknown; cacheTimestamp: number }).termsCache = mockTerms;
      (DataLoader as unknown as { termsCache: unknown; cacheTimestamp: number }).cacheTimestamp = Date.now();
      
      global.fetch = vi.fn();

      const result = await DataLoader.loadTerms();

      expect(result).toEqual(mockTerms);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should handle fetch errors gracefully', async () => {
      // Mock import.meta.env
      vi.stubGlobal('import.meta.env', { BASE_URL: '/' });
      
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
      
      const result = await DataLoader.loadTerms();
      
      expect(result).toEqual([]);
    });

    it('should handle non-ok responses', async () => {
      // Mock import.meta.env
      vi.stubGlobal('import.meta.env', { BASE_URL: '/' });
      
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      const result = await DataLoader.loadTerms();
      
      expect(result).toEqual([]);
    });
  });

  describe('getTermByEnglish', () => {
    it('should find term by english name', async () => {
      const mockTerms = [
        {
          id: 'test-1',
          english: 'Neural Network',
          korean: '신경망',
          meanings: [],
          related_terms: [],
          category: 'ML',
        },
      ];

      (DataLoader as unknown as { termsCache: unknown; cacheTimestamp: number }).termsCache = mockTerms;
      (DataLoader as unknown as { termsCache: unknown; cacheTimestamp: number }).cacheTimestamp = Date.now();

      const result = await DataLoader.getTermByEnglish('Neural Network');
      expect(result).toEqual(mockTerms[0]);
    });

    it('should return null when term not found', async () => {
      (DataLoader as unknown as { termsCache: unknown; cacheTimestamp: number }).termsCache = [];
      (DataLoader as unknown as { termsCache: unknown; cacheTimestamp: number }).cacheTimestamp = Date.now();

      const result = await DataLoader.getTermByEnglish('Nonexistent Term');
      expect(result).toBeNull();
    });
  });

  describe('clearCache', () => {
    it('should clear all cached data', () => {
      (DataLoader as unknown as { termsCache: unknown; organizationsCache: unknown; contributorsCache: unknown }).termsCache = [{ id: 'test' }];
      (DataLoader as unknown as { termsCache: unknown; organizationsCache: unknown; contributorsCache: unknown }).organizationsCache = [{ id: 'org' }];
      (DataLoader as unknown as { termsCache: unknown; organizationsCache: unknown; contributorsCache: unknown }).contributorsCache = [{ id: 'user' }];
      
      DataLoader.clearCache();
      
      expect((DataLoader as unknown as { termsCache: unknown; organizationsCache: unknown; contributorsCache: unknown }).termsCache).toBeNull();
      expect((DataLoader as unknown as { termsCache: unknown; organizationsCache: unknown; contributorsCache: unknown }).organizationsCache).toBeNull();
      expect((DataLoader as unknown as { termsCache: unknown; organizationsCache: unknown; contributorsCache: unknown }).contributorsCache).toBeNull();
    });
  });

  describe('getCacheStats', () => {
    it('should return cache statistics', () => {
      const stats = DataLoader.getCacheStats();

      expect(stats).toHaveProperty('terms');
      expect(stats).toHaveProperty('organizations');
      expect(stats).toHaveProperty('contributors');
      expect(stats).toHaveProperty('totalCacheSize');
      expect(typeof stats.terms).toBe('number');
      expect(typeof stats.organizations).toBe('number');
      expect(typeof stats.contributors).toBe('number');
    });
  });

  describe('getMemoryUsage', () => {
    it('should return memory usage information', () => {
      const memoryUsage = DataLoader.getMemoryUsage();

      expect(memoryUsage).toHaveProperty('used');
      expect(memoryUsage).toHaveProperty('total');
      expect(memoryUsage).toHaveProperty('percentage');
      expect(typeof memoryUsage.used).toBe('number');
      expect(typeof memoryUsage.total).toBe('number');
      expect(typeof memoryUsage.percentage).toBe('number');
    });

    it('should calculate percentage correctly', () => {
      const memoryUsage = DataLoader.getMemoryUsage();
      const expectedPercentage = (memoryUsage.used / memoryUsage.total) * 100;
      
      expect(memoryUsage.percentage).toBeCloseTo(expectedPercentage, 2);
    });
  });

});
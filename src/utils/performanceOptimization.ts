// 성능 최적화 유틸리티

import React, { useCallback, useRef, useEffect } from 'react';

/**
 * Debounce 훅 - 검색 등에서 성능 최적화
 */
export function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const callbackRef = useRef(callback);
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useCallback(
    ((...args) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => callbackRef.current(...args), delay);
    }) as T,
    [delay]
  );
}

/**
 * Throttle 훅 - 스크롤 이벤트 등에서 성능 최적화
 */
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const callbackRef = useRef(callback);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useCallback(
    ((...args) => {
      if (timeoutRef.current === null) {
        callbackRef.current(...args);
        timeoutRef.current = setTimeout(() => {
          timeoutRef.current = null;
        }, delay);
      }
    }) as T,
    [delay]
  );
}

/**
 * Intersection Observer 훅 - 무한 스크롤, 지연 로딩 등에 사용
 */
export function useIntersectionObserver(
  callback: (entries: IntersectionObserverEntry[]) => void,
  options: IntersectionObserverInit = {}
) {
  const targetRef = useRef<HTMLElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    // Check if IntersectionObserver is available (not in test environment)
    if (typeof IntersectionObserver === 'undefined' || !targetRef.current) {
      return;
    }

    const observer = new IntersectionObserver(callback, {
      threshold: 0.1,
      rootMargin: '50px',
      ...options,
    });

    observer.observe(targetRef.current);
    observerRef.current = observer;

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [callback]);

  return targetRef;
}

/**
 * 메모리 효율적인 데이터 캐싱
 */
class MemoryEfficientCache<T> {
  private cache = new Map<string, { data: T; timestamp: number; hits: number }>();
  private maxSize: number;
  private ttl: number;

  constructor(maxSize = 100, ttl = 5 * 60 * 1000) { // 5분 TTL
    this.maxSize = maxSize;
    this.ttl = ttl;
  }

  set(key: string, data: T): void {
    // 캐시 크기 제한
    if (this.cache.size >= this.maxSize) {
      this.evictLeastUsed();
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      hits: 0,
    });
  }

  get(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    // TTL 체크
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    // 히트 카운트 증가
    item.hits++;
    return item.data;
  }

  private evictLeastUsed(): void {
    let leastUsedKey = '';
    let leastHits = Infinity;

    for (const [key, { hits }] of this.cache.entries()) {
      if (hits < leastHits) {
        leastHits = hits;
        leastUsedKey = key;
      }
    }

    if (leastUsedKey) {
      this.cache.delete(leastUsedKey);
    }
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// 전역 캐시 인스턴스
export const dataCache = new MemoryEfficientCache(200, 10 * 60 * 1000); // 10분 TTL

/**
 * 이미지 지연 로딩을 위한 유틸리티
 */
export function useImageLazyLoading() {
  const imageRef = useRef<HTMLImageElement>(null);

  const loadImage = useCallback((src: string, onLoad?: () => void, onError?: () => void) => {
    if (!imageRef.current) return;

    const img = new Image();
    img.onload = () => {
      if (imageRef.current) {
        imageRef.current.src = src;
        onLoad?.();
      }
    };
    img.onerror = () => {
      onError?.();
    };
    img.src = src;
  }, []);

  return { imageRef, loadImage };
}

/**
 * Virtual scrolling을 위한 계산 함수
 */
export function calculateVirtualScrolling(
  containerHeight: number,
  itemHeight: number,
  scrollTop: number,
  totalItems: number,
  overscan = 5
) {
  const visibleStart = Math.floor(scrollTop / itemHeight);
  const visibleEnd = Math.min(
    visibleStart + Math.ceil(containerHeight / itemHeight),
    totalItems - 1
  );

  return {
    startIndex: Math.max(0, visibleStart - overscan),
    endIndex: Math.min(totalItems - 1, visibleEnd + overscan),
    offsetY: Math.max(0, visibleStart - overscan) * itemHeight,
  };
}

/**
 * 웹 워커를 사용한 백그라운드 처리
 */
export function createWorkerFromFunction(fn: (...args: unknown[]) => unknown): Worker {
  const blob = new Blob([`self.addEventListener('message', ${fn.toString()})`], { type: 'application/javascript' });
  return new Worker(URL.createObjectURL(blob));
}

/**
 * 메모리 사용량 모니터링 (개발용)
 */
export function monitorMemoryUsage() {
  if (process.env.NODE_ENV === 'development' && 'memory' in performance) {
    const memory = (performance as any).memory;
    console.group('Memory Usage');
    console.log('Used:', (memory.usedJSHeapSize / 1048576).toFixed(2), 'MB');
    console.log('Total:', (memory.totalJSHeapSize / 1048576).toFixed(2), 'MB');
    console.log('Limit:', (memory.jsHeapSizeLimit / 1048576).toFixed(2), 'MB');
    console.groupEnd();
  }
}

/**
 * 번들 크기 최적화를 위한 동적 import 헬퍼
 */
export async function importModule<T>(
  moduleFactory: () => Promise<{ default: T }>,
  fallback?: T
): Promise<T> {
  try {
    const module = await moduleFactory();
    return module.default;
  } catch (error) {
    console.error('Module import failed:', error);
    if (fallback) {
      return fallback;
    }
    throw error;
  }
}

/**
 * 렌더링 성능 측정
 */
export function measureRenderTime(componentName: string) {
  return function <T extends React.ComponentType<any>>(WrappedComponent: T): T {
    const MeasuredComponent = (props: any) => {
      useEffect(() => {
        const startTime = performance.now();
        
        return () => {
          const endTime = performance.now();
          if (process.env.NODE_ENV === 'development') {
            console.log(`${componentName} render time: ${(endTime - startTime).toFixed(2)}ms`);
          }
        };
      });

      return React.createElement(WrappedComponent, props);
    };

    MeasuredComponent.displayName = `MeasuredComponent(${componentName})`;
    return MeasuredComponent as T;
  };
}

/**
 * 네트워크 상태 감지
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

/**
 * 중복 API 요청 방지
 */
const requestCache = new Map<string, Promise<any>>();

export async function deduplicateRequest<T>(
  key: string,
  requestFunction: () => Promise<T>
): Promise<T> {
  if (requestCache.has(key)) {
    return requestCache.get(key);
  }

  const promise = requestFunction().finally(() => {
    // 요청 완료 후 캐시에서 제거 (중복 방지 목적이므로)
    requestCache.delete(key);
  });

  requestCache.set(key, promise);
  return promise;
}
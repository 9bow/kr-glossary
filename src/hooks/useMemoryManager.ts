import { useEffect } from 'react';
import { useDataStore } from './useDataStore';

/**
 * 메모리 관리를 위한 커스텀 훅
 * - 자동 캐시 정리
 * - 메모리 사용량 모니터링
 * - 성능 최적화
 */
export const useMemoryManager = () => {
  const { cleanupExpiredCache, optimizeMemory } = useDataStore();

  useEffect(() => {
    let memoryWarningCount = 0;
    let lastOptimizationTime = 0;

    // 주기적으로 만료된 캐시 정리 (10분마다)
    const cleanupInterval = setInterval(() => {
      cleanupExpiredCache();
    }, 10 * 60 * 1000);

    // 메모리 최적화 (20분마다)
    const optimizeInterval = setInterval(() => {
      optimizeMemory();
      lastOptimizationTime = Date.now();
    }, 20 * 60 * 1000);

    // 페이지 가시성 변경 시 메모리 정리
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // 페이지가 숨겨질 때 메모리 정리
        cleanupExpiredCache();
      } else {
        // 페이지가 다시 보일 때 메모리 최적화 (최근 5분 이내에 실행하지 않은 경우)
        const now = Date.now();
        if (now - lastOptimizationTime > 5 * 60 * 1000) {
          optimizeMemory();
          lastOptimizationTime = now;
        }
      }
    };

    // 메모리 부족 경고 처리
    const handleMemoryWarning = () => {
      memoryWarningCount++;
      console.warn(`메모리 부족 경고 감지됨 (${memoryWarningCount}회) - 캐시 정리 실행`);

      cleanupExpiredCache();

      // 경고가 2회 이상이면 강제 최적화
      if (memoryWarningCount >= 2) {
        optimizeMemory();
        memoryWarningCount = 0;
      }
    };

    // 메모리 이벤트 리스너 (지원되는 브라우저에서만)
    if ('memory' in performance) {
      // 메모리 사용량 모니터링 (60초마다 확인)
      const memoryMonitor = setInterval(() => {
        const memory = (performance as any).memory;
        if (memory) {
          const usedPercent = (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100;

          // 메모리 사용량이 75% 이상이면 최적화 실행 (사전 예방적 조정)
          if (usedPercent > 75) {
            handleMemoryWarning();
          }
        }
      }, 60 * 1000); // 60초마다 확인 (30초 → 60초)

      return () => {
        clearInterval(cleanupInterval);
        clearInterval(optimizeInterval);
        clearInterval(memoryMonitor);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }

    // 이벤트 리스너 등록
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(cleanupInterval);
      clearInterval(optimizeInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [cleanupExpiredCache, optimizeMemory]);

  return {
    cleanupExpiredCache,
    optimizeMemory,
  };
};

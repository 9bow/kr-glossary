import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { MockedFunction } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { 
  useDebounce, 
  useThrottle, 
  useIntersectionObserver,
  monitorMemoryUsage,
  measureRenderTime,
  deduplicateRequest
} from './performanceOptimization';

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

// Mock console
const mockConsole = {
  group: vi.fn(),
  groupEnd: vi.fn(),
  log: vi.fn(),
  warn: vi.fn(),
};

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('should debounce function calls', () => {
    const mockFn = vi.fn();
    const { result } = renderHook(() => useDebounce(mockFn, 500));
    
    // Call multiple times quickly
    act(() => {
      result.current('arg1');
      result.current('arg2');
      result.current('arg3');
    });
    
    // Should not have been called yet
    expect(mockFn).not.toHaveBeenCalled();
    
    // Fast-forward time
    act(() => {
      vi.advanceTimersByTime(500);
    });
    
    // Should have been called only once with last arguments
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenCalledWith('arg3');
  });

  it('should cancel previous timer on new call', () => {
    const mockFn = vi.fn();
    const { result } = renderHook(() => useDebounce(mockFn, 500));
    
    act(() => {
      result.current('arg1');
    });
    
    // Advance time partially
    act(() => {
      vi.advanceTimersByTime(300);
    });
    
    // Call again before timer completes
    act(() => {
      result.current('arg2');
    });
    
    // Advance remaining time of first timer
    act(() => {
      vi.advanceTimersByTime(200);
    });
    
    // Should not have been called yet
    expect(mockFn).not.toHaveBeenCalled();
    
    // Advance full delay from second call
    act(() => {
      vi.advanceTimersByTime(300);
    });
    
    // Should be called once with second argument
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenCalledWith('arg2');
  });
});

describe('useThrottle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('should throttle function calls', () => {
    const mockFn = vi.fn();
    const { result } = renderHook(() => useThrottle(mockFn, 500));
    
    // First call should execute immediately
    act(() => {
      result.current('arg1');
    });
    
    expect(mockFn).toHaveBeenCalledTimes(1);
    expect(mockFn).toHaveBeenCalledWith('arg1');
    
    // Subsequent calls should be ignored
    act(() => {
      result.current('arg2');
      result.current('arg3');
    });
    
    expect(mockFn).toHaveBeenCalledTimes(1);
    
    // After delay, should be able to call again
    act(() => {
      vi.advanceTimersByTime(500);
      result.current('arg4');
    });
    
    expect(mockFn).toHaveBeenCalledTimes(2);
    expect(mockFn).toHaveBeenLastCalledWith('arg4');
  });
});

describe('useIntersectionObserver', () => {
  let mockObserver: any;
  let MockIntersectionObserver: MockedFunction<any>;

  beforeEach(() => {
    mockObserver = {
      observe: vi.fn(),
      disconnect: vi.fn(),
    };

    MockIntersectionObserver = vi.fn().mockImplementation((callback) => {
      mockObserver.callback = callback;
      return mockObserver;
    });

    (global as any).IntersectionObserver = MockIntersectionObserver;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create intersection observer when target is set', () => {
    const callback = vi.fn();
    const { result } = renderHook(() => 
      useIntersectionObserver(callback, { threshold: 0.5 })
    );

    // Initially should not create observer
    expect(MockIntersectionObserver).not.toHaveBeenCalled();

    // Set target ref
    const mockElement = document.createElement('div');
    act(() => {
      if (result.current.current) {
        result.current.current = mockElement;
      }
    });

    // Re-render to trigger effect
    renderHook(() => 
      useIntersectionObserver(callback, { threshold: 0.5 })
    );
  });

  it('should handle IntersectionObserver not being available', () => {
    (global as any).IntersectionObserver = undefined;

    const callback = vi.fn();
    const { result } = renderHook(() => 
      useIntersectionObserver(callback)
    );

    expect(result.current).toBeDefined();
    expect(result.current.current).toBeNull();
  });
});

describe('monitorMemoryUsage', () => {
  beforeEach(() => {
    Object.assign(global.console, mockConsole);
    // Set NODE_ENV to development for testing
    process.env.NODE_ENV = 'development';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should log memory usage in development', () => {
    monitorMemoryUsage();

    expect(mockConsole.group).toHaveBeenCalledWith('Memory Usage');
    expect(mockConsole.log).toHaveBeenCalledWith(
      'Used:',
      expect.any(String),
      'MB'
    );
    expect(mockConsole.log).toHaveBeenCalledWith(
      'Total:',
      expect.any(String),
      'MB'
    );
    expect(mockConsole.groupEnd).toHaveBeenCalled();
  });

  it('should not log in production', () => {
    process.env.NODE_ENV = 'production';
    
    monitorMemoryUsage();

    expect(mockConsole.group).not.toHaveBeenCalled();
  });

  it('should handle missing memory API', () => {
    const originalPerformance = window.performance;
    (window.performance as any) = {};
    
    expect(() => monitorMemoryUsage()).not.toThrow();
    
    window.performance = originalPerformance;
  });
});

describe('measureRenderTime', () => {
  beforeEach(() => {
    Object.assign(global.console, mockConsole);
  });

  it('should create a higher-order component', () => {
    const MockComponent = vi.fn(() => null);
    (MockComponent as any).displayName = 'MockComponent';
    
    const MeasuredComponent = measureRenderTime('TestComponent')(MockComponent);
    
    expect(typeof MeasuredComponent).toBe('function');
    expect((MeasuredComponent as any).displayName).toContain('TestComponent');
  });
});

describe('deduplicateRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should deduplicate identical requests', async () => {
    const mockFetch = vi.fn().mockResolvedValue('result');
    const key = 'test-key';
    
    // Make multiple identical requests
    const promises = [
      deduplicateRequest(key, mockFetch),
      deduplicateRequest(key, mockFetch),
      deduplicateRequest(key, mockFetch),
    ];
    
    const results = await Promise.all(promises);
    
    // Should call fetch only once
    expect(mockFetch).toHaveBeenCalledTimes(1);
    
    // All results should be the same
    expect(results).toEqual(['result', 'result', 'result']);
  });

  it('should handle request errors', async () => {
    const error = new Error('Request failed');
    const mockFetch = vi.fn().mockRejectedValue(error);
    const key = 'error-key';
    
    await expect(deduplicateRequest(key, mockFetch)).rejects.toThrow('Request failed');
    
    // Should be able to retry after error
    const successFetch = vi.fn().mockResolvedValue('success');
    const result = await deduplicateRequest(key, successFetch);
    
    expect(result).toBe('success');
  });

  it('should allow different keys to make separate requests', async () => {
    const mockFetch1 = vi.fn().mockResolvedValue('result1');
    const mockFetch2 = vi.fn().mockResolvedValue('result2');
    
    const [result1, result2] = await Promise.all([
      deduplicateRequest('key1', mockFetch1),
      deduplicateRequest('key2', mockFetch2),
    ]);
    
    expect(mockFetch1).toHaveBeenCalledTimes(1);
    expect(mockFetch2).toHaveBeenCalledTimes(1);
    expect(result1).toBe('result1');
    expect(result2).toBe('result2');
  });
});

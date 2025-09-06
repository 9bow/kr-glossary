import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Skeleton,
} from '@mui/material';
import { ErrorOutline } from '@mui/icons-material';

interface LazyImageProps {
  src: string;
  alt: string;
  width?: number | string;
  height?: number | string;
  aspectRatio?: number;
  placeholder?: React.ReactNode;
  fallback?: React.ReactNode;
  onLoad?: () => void;
  onError?: () => void;
  className?: string;
  style?: React.CSSProperties;
  priority?: boolean; // 우선 로딩 여부
  quality?: number; // 이미지 품질 (1-100)
  sizes?: string; // 반응형 이미지용
}

/**
 * 최적화된 이미지 컴포넌트
 * - 지연 로딩
 * - 반응형 이미지
 * - 에러 처리
 * - 로딩 상태 표시
 */
const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  width,
  height,
  aspectRatio,
  placeholder,
  fallback,
  onLoad,
  onError,
  className,
  style,
  priority = false,
  quality = 80,
  sizes = '100vw',
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 이미지 URL 최적화
  const getOptimizedSrc = (src: string, quality: number): string => {
    // 실제 이미지 최적화 서비스를 사용하는 경우 여기에 로직 추가
    // 예: Cloudinary, Imgix 등의 서비스 활용
    try {
      const url = new URL(src);
      if (quality < 100) {
        url.searchParams.set('q', quality.toString());
      }
      return url.toString();
    } catch {
      return src;
    }
  };

  // Intersection Observer를 사용한 지연 로딩
  useEffect(() => {
    if (priority || isInView) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '50px', // 50px 전에 로딩 시작
        threshold: 0.1,
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [priority, isInView]);

  // 이미지 로드 핸들러
  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  // 이미지 에러 핸들러
  const handleError = () => {
    setHasError(true);
    setIsLoaded(true);
    onError?.();
  };

  // 기본 플레이스홀더
  const defaultPlaceholder = placeholder || (
    <Skeleton
      variant="rectangular"
      sx={{
        width: '100%',
        height: aspectRatio ? `calc(100% / ${aspectRatio})` : height || 200,
        borderRadius: 1,
      }}
    />
  );

  // 기본 폴백
  const defaultFallback = fallback || (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: aspectRatio ? `calc(100% / ${aspectRatio})` : height || 200,
        bgcolor: 'grey.100',
        borderRadius: 1,
        color: 'text.secondary',
      }}
    >
      <ErrorOutline sx={{ fontSize: 48, mb: 1 }} />
      <Box sx={{ textAlign: 'center', px: 2 }}>
        이미지를 불러올 수 없습니다
      </Box>
    </Box>
  );

  return (
    <Box
      ref={containerRef}
      sx={{
        position: 'relative',
        width: width || '100%',
        height: height || (aspectRatio ? `calc(100% / ${aspectRatio})` : 'auto'),
        overflow: 'hidden',
        borderRadius: 1,
      }}
      className={className}
      style={style}
    >
      {/* 로딩 중이거나 아직 보이지 않는 경우 플레이스홀더 표시 */}
      {(!isLoaded || !isInView) && !hasError && defaultPlaceholder}

      {/* 에러가 발생한 경우 폴백 표시 */}
      {hasError && defaultFallback}

      {/* 이미지가 로드될 준비가 되었을 때만 렌더링 */}
      {isInView && (
        <Box
          component="img"
          ref={imgRef}
          src={getOptimizedSrc(src, quality)}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          sizes={sizes}
          sx={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: isLoaded && !hasError ? 'block' : 'none',
            transition: 'opacity 0.3s ease-in-out',
            opacity: isLoaded && !hasError ? 1 : 0,
          }}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
        />
      )}
    </Box>
  );
};

export default LazyImage;

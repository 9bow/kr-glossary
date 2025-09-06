import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  Alert,
} from '@mui/material';
import { useSearchParams } from 'react-router-dom';
import SearchBox from '../components/search/SearchBox';
import SearchResults from '../components/search/SearchResults';
import type { SearchResult } from '../types';
import { searchTerms, getSearchEngine } from '../utils/searchIndex';

const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentQuery, setCurrentQuery] = useState('');
  const [searchTime, setSearchTime] = useState<number>(0);

  // 데이터 로딩 상태 추적
  const [dataLoaded, setDataLoaded] = useState(false);

  // 검색 수행 함수 (메모이제이션 적용)
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    // 최소 검색 길이 검증
    if (query.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    setError(null);

    const searchStartTime = performance.now();

    try {
      const searchResults = await searchTerms(query, {
        limit: 50, // 충분한 수의 결과를 가져옴
      });

      const searchDuration = performance.now() - searchStartTime;

      setResults(searchResults);
      setSearchTime(searchDuration);

      console.log(`Search completed: ${searchResults.length} results in ${searchDuration.toFixed(2)}ms`);

    } catch (err) {
      console.error('Search error:', err);
      setError('검색 중 오류가 발생했습니다.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // 데이터 초기 로딩
  useEffect(() => {
    const initializeData = async () => {
      try {
        console.log('Initializing search data...');
        const startTime = performance.now();

        // 검색 엔진 초기화 (지연 로딩)
        await getSearchEngine();

        const loadTime = performance.now() - startTime;
        console.log(`Search engine initialized in ${loadTime.toFixed(2)}ms`);

        setDataLoaded(true);
      } catch (error) {
        console.error('Failed to initialize search data:', error);
        setError('검색 데이터를 로드하는 중 오류가 발생했습니다.');
      }
    };

    initializeData();
  }, []);

  // URL 파라미터에서 검색어 읽기
  useEffect(() => {
    const query = searchParams.get('q') || '';
    setCurrentQuery(query);
    if (query && dataLoaded) {
      performSearch(query);
    }
  }, [searchParams, dataLoaded, performSearch]);

  // 검색 핸들러
  const handleSearch = useCallback((query: string, searchResults: SearchResult[]) => {
    setCurrentQuery(query);
    setResults(searchResults);

    // URL 업데이트
    if (query.trim()) {
      setSearchParams({ q: query });
    } else {
      setSearchParams({});
    }
  }, [setSearchParams]);

  // 페이지 변경 핸들러
  const handlePageChange = (page: number) => {
    // TODO: 페이지네이션 구현
    console.log('Page change:', page);
  };

  // 정렬 변경 핸들러
  const handleSortChange = (sort: string) => {
    // TODO: 정렬 기능 구현
    console.log('Sort change:', sort);
  };

  // 필터 변경 핸들러
  const handleFilterChange = (filters: any) => {
    // TODO: 필터 기능 구현
    console.log('Filter change:', filters);
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        {/* 검색 박스 */}
        <Box sx={{ mb: 4 }}>
          <SearchBox
            placeholder="AI/ML 용어를 검색하세요..."
            onSearch={handleSearch}
            fullWidth
          />
        </Box>

        {/* 검색 결과 */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <SearchResults
          results={results}
          query={currentQuery}
          loading={loading}
          error={error}
          onPageChange={handlePageChange}
          onSortChange={handleSortChange}
          onFilterChange={handleFilterChange}
          currentPage={1}
          totalPages={Math.ceil(results.length / 12)}
          totalResults={results.length}
          searchTime={searchTime}
        />
      </Box>
    </Container>
  );
};

export default SearchPage;

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Pagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Alert,
  Skeleton,
  TextField,
  Button,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Checkbox,
  FormControlLabel,

  IconButton,
  Tooltip,
  Fade,
} from '@mui/material';
import {
  ExpandMore,
  FilterList,
  Clear,
  Person,
  DateRange,
  LibraryBooks,
  FormatQuote,
  Speed,
  ViewModule,
  ViewList,
  GetApp,
  Bookmark,
  BookmarkBorder,

} from '@mui/icons-material';
import type { SearchResult, ValidationStatus } from '../../types';
import TermCard from './TermCard';

interface SearchResultsProps {
  results: SearchResult[];
  query: string;
  loading?: boolean;
  error?: string | null;
  onPageChange?: (page: number) => void;
  onSortChange?: (sort: string) => void;
  onFilterChange?: (filters: SearchFilters) => void;
  currentPage?: number;
  totalPages?: number;
  totalResults?: number;
  searchTime?: number;
}

interface SearchFilters {
  status?: ValidationStatus;
  contributor?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: 'relevance' | 'alphabetical' | 'date';
  hasExamples?: boolean;
  hasReferences?: boolean;
  [key: string]: unknown;
}

const SearchResults: React.FC<SearchResultsProps> = ({
  results,
  query,
  loading = false,
  error = null,
  onPageChange,
  onSortChange,
  onFilterChange,
  currentPage = 1,
  totalPages = 1,
  totalResults = 0,
  searchTime = 0,
}) => {


  const [filters, setFilters] = useState<SearchFilters>({
    sortBy: 'relevance',
  });

  const [itemsPerPage] = useState(12);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  // searchTime is now passed as prop
  const [bookmarkedQueries, setBookmarkedQueries] = useState<string[]>([]);
  // 북마크된 검색어 로드
  useEffect(() => {
    const bookmarks = localStorage.getItem('search-bookmarks');
    if (bookmarks) {
      setBookmarkedQueries(JSON.parse(bookmarks));
    }
  }, []);

  // 검색어 북마크 토글
  const toggleQueryBookmark = (queryToBookmark: string) => {
    const newBookmarks = bookmarkedQueries.includes(queryToBookmark)
      ? bookmarkedQueries.filter(q => q !== queryToBookmark)
      : [...bookmarkedQueries, queryToBookmark];
    
    setBookmarkedQueries(newBookmarks);
    localStorage.setItem('search-bookmarks', JSON.stringify(newBookmarks));
  };

  // 검색 결과 내보내기
  const exportResults = () => {
    const exportData = results.map(result => ({
      english: result.term.english,
      korean: result.term.korean,
      definition: result.term.definition?.korean,
      status: result.term.status,
      score: result.score
    }));
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `search-results-${query}-${new Date().toISOString().split('T')[0]}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  // 필터 변경 핸들러
  const handleFilterChange = (newFilters: Partial<SearchFilters>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    onFilterChange?.(updatedFilters);
  };

  // 정렬 변경 핸들러
  const handleSortChange = (sortBy: string) => {
    handleFilterChange({ sortBy: sortBy as SearchFilters['sortBy'] });
    onSortChange?.(sortBy);
  };

  // 페이지 변경 핸들러
  const handlePageChange = (_event: React.ChangeEvent<unknown>, page: number) => {
    onPageChange?.(page);
  };

  // 로딩 스켈레톤
  const LoadingSkeleton = () => (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 3 }}>
      {Array.from({ length: itemsPerPage }).map((_, index) => (
        <Box key={index} sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 2 }}>
          <Skeleton variant="text" width="60%" height={28} sx={{ mb: 1 }} />
          <Skeleton variant="text" width="40%" height={24} sx={{ mb: 2 }} />
          <Skeleton variant="rectangular" height={80} sx={{ mb: 2 }} />
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Skeleton variant="rectangular" width={60} height={24} />
            <Skeleton variant="rectangular" width={80} height={24} />
          </Box>
        </Box>
      ))}
    </Box>
  );

  // 에러 표시
  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 3 }}>
        검색 중 오류가 발생했습니다: {error}
      </Alert>
    );
  }

  // 결과 없음
  if (!loading && results.length === 0 && query.trim()) {
    return (
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
          "{query}"에 대한 검색 결과가 없습니다.
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          다른 검색어를 시도하거나 철자를 확인해보세요.
        </Typography>

        {/* 검색 제안 */}
        <Box sx={{ maxWidth: 400, mx: 'auto', textAlign: 'left' }}>
          <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
            검색 팁:
          </Typography>
          <Box component="ul" sx={{ pl: 2, m: 0, color: 'text.secondary' }}>
            <li>더 짧거나 일반적인 용어로 검색해보세요</li>
            <li>영어/한국어 중 하나로만 검색해보세요</li>
            <li>철자가 맞는지 확인해보세요</li>
            <li>용어의 약자나 다른 표기로 검색해보세요</li>
          </Box>
        </Box>
      </Box>
    );
  }

  // 초기 상태 (검색어 없음)
  if (!query.trim()) {
    return (
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <Typography variant="h6" color="text.secondary">
          검색어를 입력하여 AI/ML 용어를 찾아보세요.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* 검색 결과 헤더 */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              검색 결과: "{query}"
              <Tooltip title={bookmarkedQueries.includes(query) ? "북마크에서 제거" : "검색어 북마크"} arrow>
                <IconButton 
                  size="small" 
                  onClick={() => toggleQueryBookmark(query)}
                  color={bookmarkedQueries.includes(query) ? "primary" : "default"}
                >
                  {bookmarkedQueries.includes(query) ? <Bookmark /> : <BookmarkBorder />}
                </IconButton>
              </Tooltip>
            </Typography>
            
            {totalResults > 0 && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography component="span" color="text.secondary">
                  ({totalResults.toLocaleString()}개 결과)
                </Typography>
                {searchTime > 0 && (
                  <Chip 
                    icon={<Speed />} 
                    label={`${searchTime.toFixed(2)}ms`} 
                    size="small" 
                    variant="outlined" 
                    color="primary"
                  />
                )}
              </Box>
            )}
          </Box>
          
          {/* 뷰 모드 및 내보내기 */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Tooltip title="목록 보기" arrow>
              <IconButton 
                size="small" 
                onClick={() => setViewMode('list')}
                color={viewMode === 'list' ? 'primary' : 'default'}
              >
                <ViewList />
              </IconButton>
            </Tooltip>
            <Tooltip title="격자 보기" arrow>
              <IconButton 
                size="small" 
                onClick={() => setViewMode('grid')}
                color={viewMode === 'grid' ? 'primary' : 'default'}
              >
                <ViewModule />
              </IconButton>
            </Tooltip>
            {results.length > 0 && (
              <Tooltip title="결과 내보내기" arrow>
                <IconButton size="small" onClick={exportResults}>
                  <GetApp />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>



        {/* 기본 필터 및 정렬 */}
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>상태</InputLabel>
            <Select
              value={filters.status || ''}
              label="상태"
              onChange={(e) => handleFilterChange({
                status: e.target.value as ValidationStatus || undefined
              })}
            >
              <MenuItem value="">전체</MenuItem>
              <MenuItem value="validated">검증완료</MenuItem>
              <MenuItem value="proposed">제안됨</MenuItem>
              <MenuItem value="draft">초안</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>정렬</InputLabel>
            <Select
              value={filters.sortBy || 'relevance'}
              label="정렬"
              onChange={(e) => handleSortChange(e.target.value)}
            >
              <MenuItem value="relevance">관련도순</MenuItem>
              <MenuItem value="alphabetical">가나다순</MenuItem>
              <MenuItem value="date">최신순</MenuItem>
            </Select>
          </FormControl>

          <Button
            variant="outlined"
            size="small"
            startIcon={<FilterList />}
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            color={showAdvancedFilters ? 'primary' : 'inherit'}
          >
            고급 필터
          </Button>
        </Box>

        {/* 고급 필터 */}
        <Accordion
          expanded={showAdvancedFilters}
          onChange={() => setShowAdvancedFilters(!showAdvancedFilters)}
          sx={{ mt: 2, boxShadow: 'none', border: 1, borderColor: 'divider' }}
        >
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography variant="subtitle2">고급 필터 옵션</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 3 }}>
              {/* 날짜 범위 필터 */}
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <DateRange fontSize="small" />
                  날짜 범위
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    size="small"
                    label="시작일"
                    type="date"
                    value={filters.dateFrom || ''}
                    onChange={(e) => handleFilterChange({ dateFrom: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                    fullWidth
                  />
                  <TextField
                    size="small"
                    label="종료일"
                    type="date"
                    value={filters.dateTo || ''}
                    onChange={(e) => handleFilterChange({ dateTo: e.target.value })}
                    InputLabelProps={{ shrink: true }}
                    fullWidth
                  />
                </Box>
              </Box>

              {/* 기여자 필터 */}
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Person fontSize="small" />
                  기여자
                </Typography>
                <TextField
                  size="small"
                  label="기여자 검색"
                  placeholder="GitHub 사용자명"
                  value={filters.contributor || ''}
                  onChange={(e) => handleFilterChange({ contributor: e.target.value })}
                  fullWidth
                />
              </Box>

              {/* 콘텐츠 필터 */}
              <Box sx={{ gridColumn: { xs: '1', md: 'span 2' } }}>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                  콘텐츠 필터
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={filters.hasExamples || false}
                        onChange={(e) => handleFilterChange({ hasExamples: e.target.checked })}
                        size="small"
                      />
                    }
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <FormatQuote fontSize="small" />
                        예시 포함
                      </Box>
                    }
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={filters.hasReferences || false}
                        onChange={(e) => handleFilterChange({ hasReferences: e.target.checked })}
                        size="small"
                      />
                    }
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <LibraryBooks fontSize="small" />
                        참고문헌 포함
                      </Box>
                    }
                  />
                </Box>
              </Box>
            </Box>

            {/* 필터 초기화 버튼 */}
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<Clear />}
                onClick={() => {
                  const resetFilters: SearchFilters = { sortBy: 'relevance' };
                  setFilters(resetFilters);
                  onFilterChange?.(resetFilters);
                }}
                disabled={!Object.keys(filters).some(key =>
                  key !== 'sortBy' && filters[key as keyof SearchFilters]
                )}
              >
                필터 초기화
              </Button>
            </Box>
          </AccordionDetails>
        </Accordion>

        {/* 활성 필터 표시 */}
        {(filters.status || filters.contributor ||
          filters.dateFrom || filters.dateTo || filters.hasExamples || filters.hasReferences) && (
          <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
            {filters.status && (
              <Chip
                label={`상태: ${filters.status === 'validated' ? '검증완료' :
                  filters.status === 'proposed' ? '제안됨' : '초안'}`}
                size="small"
                onDelete={() => handleFilterChange({ status: undefined })}
              />
            )}
            {filters.contributor && (
              <Chip
                label={`기여자: ${filters.contributor}`}
                size="small"
                onDelete={() => handleFilterChange({ contributor: undefined })}
              />
            )}
            {filters.dateFrom && (
              <Chip
                label={`시작일: ${filters.dateFrom}`}
                size="small"
                onDelete={() => handleFilterChange({ dateFrom: undefined })}
              />
            )}
            {filters.dateTo && (
              <Chip
                label={`종료일: ${filters.dateTo}`}
                size="small"
                onDelete={() => handleFilterChange({ dateTo: undefined })}
              />
            )}
            {filters.hasExamples && (
              <Chip
                label="예시 포함"
                size="small"
                onDelete={() => handleFilterChange({ hasExamples: undefined })}
              />
            )}
            {filters.hasReferences && (
              <Chip
                label="참고문헌 포함"
                size="small"
                onDelete={() => handleFilterChange({ hasReferences: undefined })}
              />
            )}
          </Box>
        )}
      </Box>

      {/* 로딩 상태 */}
      {loading && <LoadingSkeleton />}

      {/* 검색 결과 */}
      {!loading && results.length > 0 && (
        <>
          <Box sx={{ 
            display: viewMode === 'grid' ? 'grid' : 'flex',
            flexDirection: viewMode === 'list' ? 'column' : undefined,
            gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fill, minmax(320px, 1fr))' : undefined,
            gap: viewMode === 'grid' ? 3 : 2
          }}>
            {results.map((result, index) => (
              <Fade in={true} timeout={300} style={{ transitionDelay: `${index * 50}ms` }} key={result.term.english}>
                <div>
                  <TermCard
                    term={result.term}
                    variant={viewMode === 'list' ? 'compact' : 'default'}
                    highlightQuery={query}
                    showScore={true}
                    score={result.score}
                  />
                </div>
              </Fade>
            ))}
          </Box>

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <Pagination
                count={totalPages}
                page={currentPage}
                onChange={handlePageChange}
                color="primary"
                size="large"
                showFirstButton
                showLastButton
              />
            </Box>
          )}
        </>
      )}
    </Box>
  );
};

export default SearchResults;

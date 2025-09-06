import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  TextField,
  InputAdornment,
  IconButton,
  Paper,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Typography,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Search,
  Clear,
  History,
  Settings,
  BookmarkBorder,
  Bookmark,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import type { Term, SearchResult } from '../../types';
import { searchTerms } from '../../utils/searchIndex';
import { useDataStore } from '../../hooks/useDataStore';

interface SearchBoxProps {
  placeholder?: string;
  fullWidth?: boolean;
  variant?: 'standard' | 'outlined' | 'filled';
  size?: 'small' | 'medium';
  showSuggestions?: boolean;
  onSearch?: (query: string, results: SearchResult[]) => void;
  onFocus?: () => void;
  onBlur?: () => void;
}

const SearchBox: React.FC<SearchBoxProps> = ({
  placeholder = 'AI/ML 용어 검색...',
  fullWidth = true,
  variant = 'outlined',
  size = 'medium',
  showSuggestions = true,
  onSearch,
  onFocus,
  onBlur,
}) => {

  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [searchOperator, setSearchOperator] = useState<'AND' | 'OR' | 'NOT' | 'EXACT'>('AND');

  const searchBoxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const { getCachedSearch, setCachedSearch } = useDataStore();
  const [bookmarkedQueries, setBookmarkedQueries] = useState<string[]>([]);

  // Load search history and bookmarks
  useEffect(() => {
    const history = localStorage.getItem('search-history');
    if (history) {
      setSearchHistory(JSON.parse(history));
    }

    const bookmarks = localStorage.getItem('search-bookmarks');
    if (bookmarks) {
      setBookmarkedQueries(JSON.parse(bookmarks));
    }
  }, []);

  // Apply search operators
  const applySearchOperator = (query: string): string => {
    if (!query.trim()) return query;

    const terms = query.split(' ').filter(term => term.trim());

    switch (searchOperator) {
      case 'AND':
        return terms.join(' ');
      case 'OR':
        return terms.map(term => `"${term}"`).join(' | ');
      case 'NOT':
        if (terms.length > 1) {
          const [first, ...rest] = terms;
          return `${first} -${rest.join(' -')}`;
        }
        return query;
      case 'EXACT':
        return `"${query}"`;
      default:
        return query;
    }
  };

  // Toggle bookmark
  const toggleBookmark = (query: string) => {
    const newBookmarks = bookmarkedQueries.includes(query)
      ? bookmarkedQueries.filter(q => q !== query)
      : [...bookmarkedQueries, query];

    setBookmarkedQueries(newBookmarks);
    localStorage.setItem('search-bookmarks', JSON.stringify(newBookmarks));
  };

  // Debounced search function
  const debouncedSearch = useCallback(
    async (searchQuery: string) => {
      if (!searchQuery.trim()) {
        setSuggestions([]);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        // Check cached results
        const cachedResults = getCachedSearch(searchQuery);
        if (cachedResults) {
          setSuggestions(cachedResults);
          setLoading(false);
          onSearch?.(searchQuery, cachedResults);
          return;
        }

        // Apply search operators
        const processedQuery = applySearchOperator(searchQuery);

        // Perform new search
        const results = await searchTerms(processedQuery, {
          limit: 8,
          fuzzy: searchOperator !== 'EXACT',
        });

        setSuggestions(results);
        setCachedSearch(searchQuery, results);
        onSearch?.(searchQuery, results);
      } catch (error) {
        console.error('Search error:', error);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    },
    [getCachedSearch, setCachedSearch, onSearch, applySearchOperator, searchOperator]
  );

  // Debounce search on query change
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      debouncedSearch(query);
    }, 300);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [query, debouncedSearch]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
        onBlur?.();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onBlur]);

  // Search query change handler
  const handleQueryChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setQuery(value);
    setShowDropdown(true);

    if (!showDropdown) {
      onFocus?.();
    }
  };

  // Execute search
  const handleSearch = (searchQuery: string = query) => {
    if (searchQuery.trim()) {
      // Add to search history
      const newHistory = [searchQuery, ...searchHistory.filter(h => h !== searchQuery)].slice(0, 10);
      setSearchHistory(newHistory);
      localStorage.setItem('search-history', JSON.stringify(newHistory));

      // Navigate to search page
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
      setShowDropdown(false);
      inputRef.current?.blur();
    }
  };

  // Clear search query
  const handleClear = () => {
    setQuery('');
    setSuggestions([]);
    setShowDropdown(false);
    inputRef.current?.focus();
  };

  // Keyboard event handler
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleSearch();
    } else if (event.key === 'Escape') {
      setShowDropdown(false);
      inputRef.current?.blur();
    }
  };

  // 제안 항목 클릭
  const handleSuggestionClick = (term: Term) => {
    navigate(`/terms/${encodeURIComponent(term.english)}`);
    setShowDropdown(false);
  };

  // 검색 히스토리 클릭
  const handleHistoryClick = (historyQuery: string) => {
    setQuery(historyQuery);
    handleSearch(historyQuery);
  };

  return (
    <Box ref={searchBoxRef} sx={{ position: 'relative', width: fullWidth ? '100%' : 'auto' }}>
              <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            ref={inputRef}
            fullWidth={fullWidth}
            variant={variant}
            size={size}
            value={query}
            onChange={handleQueryChange}
            onFocus={() => {
              setShowDropdown(true);
              onFocus?.();
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  {loading ? (
                    <CircularProgress size={20} />
                  ) : query ? (
                    <>
                      <IconButton
                        size="small"
                        onClick={() => toggleBookmark(query)}
                        aria-label="북마크 토글"
                      >
                        {bookmarkedQueries.includes(query) ? <Bookmark /> : <BookmarkBorder />}
                      </IconButton>
                      <IconButton size="small" onClick={handleClear} aria-label="검색어 지우기">
                        <Clear />
                      </IconButton>
                    </>
                  ) : null}
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
              },
            }}
          />

          <IconButton
            onClick={() => setShowAdvanced(!showAdvanced)}
            color={showAdvanced ? 'primary' : 'default'}
            sx={{ alignSelf: 'center' }}
          >
            <Settings />
          </IconButton>
        </Box>

        {/* 고급 검색 옵션 */}
        {showAdvanced && (
          <Box sx={{ mt: 1, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: 1, borderColor: 'divider' }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>고급 검색 옵션</Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
              <FormControl size="small" sx={{ minWidth: 100 }}>
                <InputLabel>연산자</InputLabel>
                <Select
                  value={searchOperator}
                  label="연산자"
                  onChange={(e) => setSearchOperator(e.target.value as typeof searchOperator)}
                >
                  <MenuItem value="AND">AND (모두 포함)</MenuItem>
                  <MenuItem value="OR">OR (하나라도 포함)</MenuItem>
                  <MenuItem value="NOT">NOT (제외)</MenuItem>
                  <MenuItem value="EXACT">정확한 구문</MenuItem>
                </Select>
              </FormControl>

              <Typography variant="caption" color="text.secondary">
                {searchOperator === 'AND' && '모든 단어가 포함된 결과를 찾습니다'}
                {searchOperator === 'OR' && '하나 이상의 단어가 포함된 결과를 찾습니다'}
                {searchOperator === 'NOT' && '첫 번째 단어를 포함하고 나머지 단어들을 제외합니다'}
                {searchOperator === 'EXACT' && '정확한 구문으로 검색합니다'}
              </Typography>
            </Box>
          </Box>
        )}

      {/* 드롭다운 메뉴 */}
      {showDropdown && showSuggestions && (
        <Paper
          elevation={3}
          sx={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 1000,
            mt: 1,
            maxHeight: 400,
            overflow: 'auto',
            borderRadius: 2,
          }}
        >
          {/* 검색 결과 */}
          {suggestions.length > 0 && (
            <List dense>
              <Typography variant="subtitle2" sx={{ px: 2, py: 1, color: 'text.secondary' }}>
                검색 결과
              </Typography>
              {suggestions.slice(0, 5).map((result) => (
                <ListItem key={result.term.english} disablePadding>
                  <ListItemButton
                    onClick={() => handleSuggestionClick(result.term)}
                    sx={{
                      '&:hover': {
                        backgroundColor: 'action.hover',
                      },
                    }}
                  >
                    <ListItemText
                      primary={
                        <Box>
                          <Typography variant="body1" component="div">
                            {result.term.english}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {result.term.korean}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                          <Chip
                            label="용어"
                            size="small"
                            variant="outlined"
                            sx={{ height: 20 }}
                          />
                          <Typography variant="caption" color="text.secondary">
                            {Math.round(result.score * 100)}% 일치
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItemButton>
                </ListItem>
              ))}

              {/* 더 많은 결과 보기 */}
              {suggestions.length > 5 && (
                <ListItem disablePadding>
                  <ListItemButton onClick={() => handleSearch()}>
                    <ListItemText
                      primary={
                        <Typography variant="body2" color="primary">
                          {suggestions.length - 5}개 더 보기...
                        </Typography>
                      }
                    />
                  </ListItemButton>
                </ListItem>
              )}
            </List>
          )}

          {/* 북마크된 검색어 */}
          {query === '' && bookmarkedQueries.length > 0 && (
            <List dense>
              <Typography variant="subtitle2" sx={{ px: 2, py: 1, color: 'text.secondary' }}>
                북마크된 검색어
              </Typography>
              {bookmarkedQueries.slice(0, 3).map((bookmarkedQuery, index) => (
                <ListItem key={index} disablePadding>
                  <ListItemButton onClick={() => handleHistoryClick(bookmarkedQuery)}>
                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                      <Bookmark sx={{ mr: 1, fontSize: 18, color: 'primary.main' }} />
                      <ListItemText primary={bookmarkedQuery} />
                    </Box>
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          )}

          {/* 검색 히스토리 */}
          {query === '' && searchHistory.length > 0 && (
            <List dense>
              <Typography variant="subtitle2" sx={{ px: 2, py: 1, color: 'text.secondary' }}>
                최근 검색
              </Typography>
              {searchHistory.slice(0, 5).map((historyQuery, index) => (
                <ListItem key={index} disablePadding>
                  <ListItemButton onClick={() => handleHistoryClick(historyQuery)}>
                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                      <History sx={{ mr: 1, fontSize: 18, color: 'text.secondary' }} />
                      <ListItemText primary={historyQuery} />
                    </Box>
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          )}

          {/* 검색 결과가 없을 때 */}
          {query && !loading && suggestions.length === 0 && (
            <Box sx={{ p: 2, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                "{query}"에 대한 검색 결과가 없습니다.
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                다른 검색어를 시도해보세요.
              </Typography>
            </Box>
          )}
        </Paper>
      )}
    </Box>
  );
};

export default SearchBox;

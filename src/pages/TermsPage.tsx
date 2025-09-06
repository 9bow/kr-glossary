import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Container,
  Typography,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Paper,

  TextField,
  InputAdornment,
  Breadcrumbs,
  Link as MuiLink,
  useTheme,
  alpha,
} from '@mui/material';
import { Search, Home } from '@mui/icons-material';
import { Link, useNavigate } from 'react-router-dom';
import type { Term } from '../types';
import { loadTerms } from '../utils/dataLoader';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`terms-tabpanel-${index}`}
      aria-labelledby={`terms-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `terms-tab-${index}`,
    'aria-controls': `terms-tabpanel-${index}`,
  };
}

// 한국어 초성 그룹화
function getKoreanInitial(term: Term): string {
  const korean = term.korean.charAt(0);
  const code = korean.charCodeAt(0);

  // 가-힣 범위 확인
  if (code >= 0xAC00 && code <= 0xD7A3) {
    const initialIndex = Math.floor((code - 0xAC00) / 588);
    const initials = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
    return initials[initialIndex] || '기타';
  }

  return '기타';
}

// 영어 알파벳 그룹화
function getEnglishInitial(term: Term): string {
  const english = term.english.charAt(0).toUpperCase();
  if (/[A-Z]/.test(english)) {
    return english;
  }
  return '#';
}

const TermsPage: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(1);
  const [terms, setTerms] = useState<Term[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // 데이터 로딩
  useEffect(() => {
    const loadTermsData = async () => {
      try {

        const termsData = await loadTerms();


        setTerms(termsData);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (_error) {
        // Error handling removed for production
      } finally {
        setLoading(false);
      }
    };

    loadTermsData();
  }, []);

  // 탭 변경 핸들러
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // 용어 그룹화
  const groupedTerms = useMemo(() => {
    const filteredTerms = terms.filter(term =>
      searchQuery === '' ||
      term.english.toLowerCase().includes(searchQuery.toLowerCase()) ||
      term.korean.includes(searchQuery)
    );

    const koreanGroups: Record<string, Term[]> = {};
    const englishGroups: Record<string, Term[]> = {};

    filteredTerms.forEach(term => {
      // 한국어 그룹화
      const koreanInitial = getKoreanInitial(term);
      if (!koreanGroups[koreanInitial]) {
        koreanGroups[koreanInitial] = [];
      }
      koreanGroups[koreanInitial].push(term);

      // 영어 그룹화
      const englishInitial = getEnglishInitial(term);
      if (!englishGroups[englishInitial]) {
        englishGroups[englishInitial] = [];
      }
      englishGroups[englishInitial].push(term);
    });

    // 각 그룹 내에서 정렬
    Object.keys(koreanGroups).forEach(key => {
      koreanGroups[key].sort((a, b) => a.korean.localeCompare(b.korean));
    });

    Object.keys(englishGroups).forEach(key => {
      englishGroups[key].sort((a, b) => a.english.localeCompare(b.english));
    });

    return { koreanGroups, englishGroups };
  }, [terms, searchQuery]);

  // 그룹 키 정렬
  const koreanGroupKeys = useMemo(() =>
    Object.keys(groupedTerms.koreanGroups).sort(), [groupedTerms.koreanGroups]
  );

  const englishGroupKeys = useMemo(() =>
    Object.keys(groupedTerms.englishGroups).sort(), [groupedTerms.englishGroups]
  );

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h4" sx={{ textAlign: 'center', py: 8 }}>
          용어 목록을 불러오는 중...
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 3 }}>
        <MuiLink component={Link} to="/" sx={{ display: 'flex', alignItems: 'center' }}>
          <Home sx={{ mr: 0.5 }} fontSize="inherit" />
          홈
        </MuiLink>
        <Typography color="text.primary">전체 용어 목록</Typography>
      </Breadcrumbs>

      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" sx={{ mb: 2, fontWeight: 700 }}>
          전체 용어 목록
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          총 {terms.length}개의 AI/ML 용어를 확인하세요
        </Typography>

        {/* 검색바 */}
        <TextField
          fullWidth
          placeholder="용어를 검색하세요..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          variant="outlined"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
          sx={{
            maxWidth: 400,
            '& .MuiOutlinedInput-root': {
              backgroundColor: alpha(theme.palette.background.paper, 0.8),
            },
          }}
        />
      </Box>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          aria-label="terms sorting tabs"
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            '& .MuiTab-root': {
              minHeight: 48,
            },
          }}
        >
          <Tab label="ABC 순" {...a11yProps(0)} />
          <Tab label="가나다 순" {...a11yProps(1)} />
        </Tabs>

        {/* Korean Tab */}
        <TabPanel value={tabValue} index={1}>
          {koreanGroupKeys.length === 0 ? (
            <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              검색 결과가 없습니다.
            </Typography>
          ) : (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 3 }}>
              {koreanGroupKeys.map(groupKey => (
                <Paper key={groupKey} elevation={1} sx={{ p: 2 }}>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: 'primary.main' }}>
                    {groupKey}
                  </Typography>
                  <List dense>
                    {groupedTerms.koreanGroups[groupKey].slice(0, 10).map(term => (
                      <ListItem key={term.english} disablePadding>
                        <ListItemButton
                          onClick={() => navigate(`/terms/${encodeURIComponent(term.english)}`)}
                          sx={{
                            borderRadius: 1,
                            '&:hover': {
                              backgroundColor: alpha(theme.palette.primary.main, 0.08),
                            },
                          }}
                        >
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                  {term.korean}
                                </Typography>

                              </Box>
                            }
                            secondary={term.english}
                          />
                        </ListItemButton>
                      </ListItem>
                    ))}
                    {groupedTerms.koreanGroups[groupKey].length > 10 && (
                      <ListItem>
                        <ListItemText
                          secondary={`+ ${groupedTerms.koreanGroups[groupKey].length - 10}개 더보기`}
                          sx={{ textAlign: 'center', color: 'text.secondary' }}
                        />
                      </ListItem>
                    )}
                  </List>
                </Paper>
              ))}
            </Box>
          )}
        </TabPanel>

        {/* English Tab */}
        <TabPanel value={tabValue} index={0}>
          {englishGroupKeys.length === 0 ? (
            <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
              검색 결과가 없습니다.
            </Typography>
          ) : (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 3 }}>
              {englishGroupKeys.map(groupKey => (
                <Paper key={groupKey} elevation={1} sx={{ p: 2 }}>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: 'primary.main' }}>
                    {groupKey}
                  </Typography>
                  <List dense>
                    {groupedTerms.englishGroups[groupKey].slice(0, 10).map(term => (
                      <ListItem key={term.english} disablePadding>
                        <ListItemButton
                          onClick={() => navigate(`/terms/${encodeURIComponent(term.english)}`)}
                          sx={{
                            borderRadius: 1,
                            '&:hover': {
                              backgroundColor: alpha(theme.palette.primary.main, 0.08),
                            },
                          }}
                        >
                          <ListItemText
                            primary={
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                  {term.english}
                                </Typography>

                              </Box>
                            }
                            secondary={term.korean}
                          />
                        </ListItemButton>
                      </ListItem>
                    ))}
                    {groupedTerms.englishGroups[groupKey].length > 10 && (
                      <ListItem>
                        <ListItemText
                          secondary={`+ ${groupedTerms.englishGroups[groupKey].length - 10}개 더보기`}
                          sx={{ textAlign: 'center', color: 'text.secondary' }}
                        />
                      </ListItem>
                    )}
                  </List>
                </Paper>
              ))}
            </Box>
          )}
        </TabPanel>
      </Paper>
    </Container>
  );
};

export default TermsPage;


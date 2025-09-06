import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Container,
  Card,
  CardContent,
  Chip,
  useTheme,
  Button,
  Skeleton,
} from '@mui/material';
import { TrendingUp, Verified, AutoAwesome, Explore, BarChart } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import OnboardingTutorial from '../components/common/OnboardingTutorial';
import SearchBox from '../components/search/SearchBox';
import { getTermsCount } from '../utils/dataLoader';
import { useIntersectionObserver } from '../utils/performanceOptimization';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const [stats, setStats] = useState([
    { label: '등록된 용어', value: '로딩 중...', icon: <TrendingUp />, loading: true },
    { label: '활성 기여자', value: '로딩 중...', icon: <Verified />, loading: true },
    { label: '검증된 조직', value: '로딩 중...', icon: <Verified />, loading: true },
    { label: '월간 조회수', value: '로딩 중...', icon: <BarChart />, loading: true },
  ]);

  // Stats 로딩 상태 관리 (개발 시에는 즉시 로드, 프로덕션에서는 지연 로딩)
  const [hasLoadedStats, setHasLoadedStats] = useState(process.env.NODE_ENV === 'test');
  
  // Intersection Observer를 통해 지연 로딩 (테스트 환경이 아닐 때만)
  const intersectionRef = useIntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting && !hasLoadedStats) {
        setHasLoadedStats(true);
      }
    },
    { threshold: 0.1, rootMargin: '50px' }
  );

  // 실제 ref는 테스트 환경에서는 사용하지 않음
  const actualRef = process.env.NODE_ENV === 'test' ? { current: null } : intersectionRef;

  // Mock data for categories and featured terms
  const categories = [
    { name: 'ML', label: '머신러닝' },
    { name: 'DL', label: '딥러닝' },
    { name: 'NLP', label: '자연어처리' },
    { name: 'CV', label: '컴퓨터 비전' },
    { name: 'RL', label: '강화학습' },
    { name: 'GAI', label: '생성형 AI' },
  ];

  const featuredTerms = [
    { english: 'Machine Learning', korean: '기계학습' },
    { english: 'Deep Learning', korean: '딥러닝' },
    { english: 'Natural Language Processing', korean: '자연어처리' },
  ];

  // 테스트 환경에서는 즉시 로드, 아니면 hasLoadedStats가 true가 될 때 로드
  useEffect(() => {
    if (process.env.NODE_ENV === 'test') {
      setHasLoadedStats(true);
    }
  }, []);

  useEffect(() => {
    if (!hasLoadedStats) return;

    const loadData = async () => {
      try {
        const count = await getTermsCount();
        setStats([
          { label: '등록된 용어', value: count.toString(), icon: <TrendingUp />, loading: false },
          { label: '활성 기여자', value: '15', icon: <Verified />, loading: false },
          { label: '검증된 조직', value: '8', icon: <Verified />, loading: false },
          { label: '월간 조회수', value: '1.2K', icon: <BarChart />, loading: false },
        ]);
      } catch (error) {
        console.error('Failed to load data:', error);
        setStats([
          { label: '등록된 용어', value: 'N/A', icon: <TrendingUp />, loading: false },
          { label: '활성 기여자', value: 'N/A', icon: <Verified />, loading: false },
          { label: '검증된 조직', value: 'N/A', icon: <Verified />, loading: false },
          { label: '월간 조회수', value: 'N/A', icon: <BarChart />, loading: false },
        ]);
      }
    };

    loadData();
  }, [hasLoadedStats]);

  return (
    <Box component="main" role="main">
      {/* Hero Section */}
      <Box
        sx={{
          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
          color: 'white',
          py: { xs: 6, md: 8 },
          textAlign: 'center',
        }}
      >
        <Container maxWidth="md">
          <Typography
            variant="h1"
            sx={{
              mb: 2,
              fontSize: { xs: '2rem', md: '2.5rem' },
              fontWeight: 700,
            }}
          >
            AI/ML 용어집
          </Typography>
          <Typography
            variant="h6"
            sx={{
              mb: 4,
              opacity: 0.9,
              fontSize: { xs: '1rem', md: '1.25rem' },
            }}
          >
            함께 만드는 한국어 AI/ML 용어집
          </Typography>

          {/* Enhanced Search Bar */}
          <Box sx={{ maxWidth: 650, mx: 'auto', mb: 4 }}>
            <Box sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(10px)',
                border: '2px solid rgba(255, 255, 255, 0.3)',
                borderRadius: 4,
                fontSize: '1.1rem',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                transition: 'all 0.3s ease-in-out',
                '& fieldset': {
                  border: 'none',
                },
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 1)',
                  boxShadow: '0 12px 40px rgba(0, 0, 0, 0.15)',
                  transform: 'translateY(-1px)',
                },
                '&.Mui-focused': {
                  backgroundColor: 'rgba(255, 255, 255, 1)',
                  boxShadow: '0 16px 48px rgba(0, 0, 0, 0.2)',
                  transform: 'translateY(-2px)',
                },
              },
              '& .MuiInputAdornment-root .MuiSvgIcon-root': {
                color: theme.palette.primary.main,
              },
              '& .MuiOutlinedInput-input': {
                color: theme.palette.text.primary,
                '&::placeholder': {
                  color: theme.palette.text.secondary,
                  opacity: 0.8,
                },
              },
              '& .MuiPaper-root': {
                backgroundColor: 'rgba(255, 255, 255, 0.98)',
                backdropFilter: 'blur(20px)',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
              }
            }}>
              <SearchBox
                placeholder="AI/ML 용어를 검색해보세요..."
                size="medium"
                variant="outlined"
                showSuggestions={true}
                onSearch={(query, _results) => {
                  if (query.trim()) {
                    navigate(`/search?q=${encodeURIComponent(query.trim())}`);
                  }
                }}
              />
            </Box>
          </Box>

          {/* Quick Actions */}
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              startIcon={<Explore />}
              onClick={() => navigate('/search')}
              sx={{
                color: 'white',
                borderColor: 'rgba(255, 255, 255, 0.5)',
                '&:hover': {
                  borderColor: 'white',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                }
              }}
            >
              용어 검색하기
            </Button>
            <Button
              variant="outlined"
              startIcon={<AutoAwesome />}
              onClick={() => navigate('/contribute')}
              sx={{
                color: 'white',
                borderColor: 'rgba(255, 255, 255, 0.5)',
                '&:hover': {
                  borderColor: 'white',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                }
              }}
            >
              용어 추가하기
            </Button>
          </Box>


        </Container>
      </Box>

      {/* Stats Section */}
      <Container sx={{ py: 4 }}>
        <Box 
          ref={actualRef}
          sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 3 }}
        >
          {stats.map((stat, index) => (
            <Box
              key={index}
              sx={{
                textAlign: 'center',
                p: 3,
                borderRadius: 3,
                backgroundColor: 'background.paper',
                boxShadow: 2,
                transition: 'transform 0.2s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: 4,
                }
              }}
            >
              <Box sx={{ color: 'primary.main', mb: 2, fontSize: '2rem' }}>
                {stat.icon}
              </Box>
              {stat.loading ? (
                <Skeleton variant="text" height={48} sx={{ mb: 1 }} />
              ) : (
                <Typography variant="h4" sx={{ fontWeight: 700, mb: 1, color: 'primary.main' }}>
                  {stat.value}
                </Typography>
              )}
              <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500 }}>
                {stat.label}
              </Typography>
            </Box>
          ))}
        </Box>
      </Container>

      {/* Categories Section */}
      <Container sx={{ py: 4 }}>
        <Typography variant="h4" sx={{ mb: 4, textAlign: 'center', fontWeight: 600 }}>
          용어 카테고리
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
          {categories.map((category) => (
            <Chip
              key={category.name}
              label={category.name}
              variant="outlined"
              color="primary"
              onClick={() => navigate(`/search?category=${category.name}`)}
              sx={{ 
                fontSize: '1rem', 
                fontWeight: 600,
                px: 2,
                py: 1,
                height: 'auto',
                cursor: 'pointer',
                '&:hover': {
                  backgroundColor: 'primary.light',
                  color: 'white',
                }
              }}
            />
          ))}
        </Box>
      </Container>

      {/* Featured Terms Section */}
      <Container sx={{ py: 4, backgroundColor: 'background.default' }}>
        <Typography variant="h4" sx={{ mb: 4, textAlign: 'center', fontWeight: 600 }}>
          추천 용어
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 3 }}>
          {featuredTerms.map((term, index) => (
            <Card
              key={index}
              sx={{
                cursor: 'pointer',
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: 3,
                },
              }}
              onClick={() => navigate(`/terms/${encodeURIComponent(term.english)}`)}
            >
              <CardContent sx={{ p: 3 }}>
                <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500, mb: 1 }}>
                  {term.english}
                </Typography>
                <Typography variant="h6" sx={{ color: 'primary.main', fontWeight: 600 }}>
                  {term.korean}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Box>
      </Container>


      {/* 튜토리얼 컴포넌트 */}
      <OnboardingTutorial />
    </Box>
  );
};

export default HomePage;
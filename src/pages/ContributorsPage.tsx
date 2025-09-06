import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Container,
  Card,
  CardContent,
  Avatar,
  Chip,
  Grid,
  Skeleton,
  Alert,
  Breadcrumbs,
  Link as MuiLink,


} from '@mui/material';
import { Home, GitHub, Person } from '@mui/icons-material';
import { Link } from 'react-router-dom';
import type { Contributor } from '../types';
import { loadContributors } from '../utils/organizationLoader';

const ContributorsPage: React.FC = () => {

  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadContributorData = async () => {
      try {
        setLoading(true);
        const contributorData = await loadContributors();
        setContributors(contributorData);
        setError(null);
      } catch (err) {
        console.error('Error loading contributors:', err);
        setError('기여자 데이터를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    loadContributorData();
  }, []);

  const getContributionTypeLabel = (type: Contributor['contributionType']) => {
    switch (type) {
      case 'author':
        return '저자';
      case 'editor':
        return '편집자';
      case 'reviewer':
        return '검토자';
      default:
        return '기여자';
    }
  };

  const getContributionTypeColor = (type: Contributor['contributionType']) => {
    switch (type) {
      case 'author':
        return 'primary';
      case 'editor':
        return 'secondary';
      case 'reviewer':
        return 'success';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ py: 4 }}>
          <Skeleton variant="text" width={300} height={40} sx={{ mb: 2 }} />
          <Skeleton variant="text" width={600} height={24} sx={{ mb: 4 }} />
          <Grid container spacing={3}>
            {Array.from({ length: 12 }).map((_, index) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={index}>
                <Card>
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Skeleton variant="circular" width={48} height={48} sx={{ mr: 2 }} />
                      <Box sx={{ flex: 1 }}>
                        <Skeleton variant="text" width={120} height={24} />
                        <Skeleton variant="text" width={80} height={20} />
                      </Box>
                    </Box>
                    <Skeleton variant="text" width="100%" height={40} />
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ py: 4 }}>
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        {/* Breadcrumbs */}
        <Breadcrumbs sx={{ mb: 3 }}>
          <MuiLink component={Link} to="/" sx={{ display: 'flex', alignItems: 'center' }}>
            <Home sx={{ mr: 0.5 }} fontSize="inherit" />
            홈
          </MuiLink>
          <Typography color="text.primary">기여자</Typography>
        </Breadcrumbs>

        {/* Header */}
        <Box sx={{ mb: 4, textAlign: 'center' }}>
          <Typography variant="h3" sx={{ mb: 2, fontWeight: 700 }}>
            기여자
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
            AI/ML 용어집을 함께 만들어가는 커뮤니티 멤버들
          </Typography>
          <Typography variant="body1" color="text.secondary">
            총 {contributors.length}명의 기여자들이 참여하고 있습니다.
          </Typography>
        </Box>

        {/* Contributors Grid */}
        <Grid container spacing={3}>
          {contributors.map((contributor) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={contributor.githubUsername}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4,
                  },
                }}
              >
                <CardContent sx={{ p: 3, flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar
                      src={`https://github.com/${contributor.githubUsername}.png`}
                      alt={contributor.githubUsername}
                      sx={{
                        width: 48,
                        height: 48,
                        mr: 2,
                        bgcolor: 'primary.main',
                      }}
                    >
                      <Person />
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                        {contributor.githubUsername}
                      </Typography>
                      <Chip
                        label={getContributionTypeLabel(contributor.contributionType)}
                        size="small"
                        color={getContributionTypeColor(contributor.contributionType)}
                        variant="outlined"
                      />
                    </Box>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      마지막 기여: {new Date(contributor.timestamp).toLocaleDateString('ko-KR')}
                    </Typography>
                    <MuiLink
                      href={`https://github.com/${contributor.githubUsername}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        color: 'text.secondary',
                        textDecoration: 'none',
                        '&:hover': {
                          color: 'primary.main',
                        },
                      }}
                    >
                      <GitHub fontSize="small" />
                    </MuiLink>
                  </Box>

                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                    AI/ML 용어집의 발전에 기여해주신 분입니다. 다양한 용어 번역과 검토 작업에 참여하고 계십니다.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {contributors.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h6" color="text.secondary">
              아직 등록된 기여자가 없습니다.
            </Typography>
          </Box>
        )}
      </Box>
    </Container>
  );
};

export default ContributorsPage;

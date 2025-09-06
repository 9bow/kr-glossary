import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Container,
  Card,
  CardContent,
  Chip,
  Grid,
  Avatar,
  Link,
  Skeleton,
  Alert,
  Breadcrumbs,
  Link as MuiLink,
} from '@mui/material';
import {

  Home,
  GitHub,
  House,
} from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';

import type { Organization } from '../types';
import { loadOrganizations } from '../utils/organizationLoader';

const OrganizationsPage: React.FC = () => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadOrganizationData = async () => {
      try {
        setLoading(true);
        const orgs = await loadOrganizations();
        setOrganizations(orgs);
        setError(null);
      } catch (err) {
        console.error('Error loading organizations:', err);
        setError('조직 데이터를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    loadOrganizationData();
  }, []);



  const getTypeLabel = (type: Organization['type']) => {
    switch (type) {
      case 'publisher':
        return '출판사';
      case 'university':
        return '대학';
      case 'company':
        return '기업';
      case 'community':
        return '커뮤니티';
      default:
        return '조직';
    }
  };

  const getTypeColor = (type: Organization['type']) => {
    switch (type) {
      case 'publisher':
        return 'primary';
      case 'university':
        return 'secondary';
      case 'company':
        return 'success';
      case 'community':
        return 'info';
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
            {Array.from({ length: 6 }).map((_, index) => (
              <Grid size={{ xs: 12, md: 6 }} key={index}>
                <Card>
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Skeleton variant="circular" width={40} height={40} sx={{ mr: 2 }} />
                      <Box>
                        <Skeleton variant="text" width={200} height={24} />
                        <Skeleton variant="text" width={150} height={20} />
                      </Box>
                    </Box>
                    <Skeleton variant="text" width="100%" height={60} />
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

  // 기업과 대학 제외하고 필터링
  const filteredOrganizations = organizations.filter(org =>
    org.type !== 'company' && org.type !== 'university'
  );

  // 유효한 로고 파일 목록 (빈 파일 제외)
  const validLogoFiles = [
    'gilbut.co.kr.png',
    'booksr.co.kr.png',
    'hanbit.co.kr.png',
    'pytorch.kr.png',
    'rubypaper.co.kr.png',
    'wikibook.co.kr.png',
    'youngjin.com.png'
  ];

  // 로고 파일 존재 여부 확인 함수
  const hasValidLogo = (org: Organization): boolean => {
    try {
      if (org.homepage) {
        const url = new URL(org.homepage);
        let domain = url.hostname;

        // www. 제거
        domain = domain.replace(/^www\./, '');

        // 한글 이름을 영문 도메인으로 변환
        const koreanToDomainMap: Record<string, string> = {
          '제이펍': 'jpub.tistory.com',
          '비제이퍼블릭': 'bjpublic.tistory.com',
          '길벗': 'gilbut.co.kr',
          '루비페이퍼': 'rubypaper.co.kr',
          '인사이트': 'insightbook.co.kr',
          '위키북스': 'wikibook.co.kr',
          '영진닷컴': 'youngjin.com',
          '생능출판사': 'booksr.co.kr',
          '한빛미디어': 'hanbit.co.kr',
          '골든래빗': 'goldenrabbit.co.kr',
          '정보문화사': 'icc.co.kr',
          '에이콘출판': 'acornpub.co.kr',
          '책만': 'bookand.co.kr',
          '파이토치 한국 사용자 모임': 'pytorch.kr'
        };

        if (koreanToDomainMap[org.name]) {
          domain = koreanToDomainMap[org.name];
        }

        const logoPath = `${domain}.png`;
        return validLogoFiles.includes(logoPath);
      }
    } catch (error) {
      console.warn(`Invalid homepage URL for ${org.name}:`, org.homepage, error);
    }
    return false;
  };

  // 필터링된 조직들을 무작위로 섞기
  const shuffledOrganizations = [...filteredOrganizations].sort(() => Math.random() - 0.5);

  return (
    <Container maxWidth="lg">
      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 3 }}>
        <MuiLink component={RouterLink} to="/" sx={{ display: 'flex', alignItems: 'center' }}>
          <Home sx={{ mr: 0.5 }} fontSize="inherit" />
          홈
        </MuiLink>
        <Typography color="text.primary">참여 조직</Typography>
      </Breadcrumbs>

      <Box sx={{ py: 4 }}>
        {/* 헤더 */}
        <Box sx={{ mb: 4, textAlign: 'center' }}>
          <Typography variant="h3" sx={{ mb: 2, fontWeight: 700 }}>
            참여 조직
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
            AI/ML 용어집을 함께 만들어가는 커뮤니티와 출판사
          </Typography>
          <Typography variant="body1" color="text.secondary">
            총 {filteredOrganizations.length}곳의 조직들이 함께 하고 있습니다.
          </Typography>
        </Box>

        {/* 조직 목록 */}
        <Grid container spacing={3}>
          {shuffledOrganizations.map((org) => (
            <Grid size={{ xs: 12, sm: 6 }} key={org.name}>
              <Card
                sx={{
                  height: 220,
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4,
                  },
                }}
              >
                {/* 우측 상단 로고 */}
                {hasValidLogo(org) && (
                  <Box
                    component="img"
                    src={(() => {
                      try {
                        if (org.homepage) {
                          const url = new URL(org.homepage);
                          let domain = url.hostname;

                          // www. 제거
                          domain = domain.replace(/^www\./, '');

                          // 한글 이름을 영문 도메인으로 변환
                          const koreanToDomainMap: Record<string, string> = {
                            '제이펍': 'jpub.tistory.com',
                            '비제이퍼블릭': 'bjpublic.tistory.com',
                            '길벗': 'gilbut.co.kr',
                            '루비페이퍼': 'rubypaper.co.kr',
                            '인사이트': 'insightbook.co.kr',
                            '위키북스': 'wikibook.co.kr',
                            '영진닷컴': 'youngjin.com',
                            '생능출판사': 'booksr.co.kr',
                            '한빛미디어': 'hanbit.co.kr',
                            '골든래빗': 'goldenrabbit.co.kr',
                            '정보문화사': 'icc.co.kr',
                            '에이콘출판': 'acornpub.co.kr',
                            '책만': 'bookand.co.kr',
                            '파이토치 한국 사용자 모임': 'pytorch.kr'
                          };

                          if (koreanToDomainMap[org.name]) {
                            domain = koreanToDomainMap[org.name];
                          }

                          const logoPath = `/logos/${domain}.png`;
                          console.log(`Loading top-right logo for ${org.name}: ${logoPath}`);
                          return logoPath;
                        }
                      } catch (error) {
                        console.warn(`Invalid homepage URL for ${org.name}:`, org.homepage, error);
                      }
                      return undefined;
                    })()}
                    alt={`${org.name} 로고`}
                    sx={{
                      position: 'absolute',
                      top: 16,
                      right: 16,
                      width: 48,
                      height: 48,
                      objectFit: 'contain',
                      borderRadius: 1,
                      zIndex: 1,
                      backgroundColor: 'white',
                      padding: 0.5,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    }}
                    onError={(e) => {
                      console.warn(`Failed to load top-right logo for ${org.name}`);
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                    onLoad={() => {
                      console.log(`Successfully loaded top-right logo for ${org.name}`);
                    }}
                  />
                )}

                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar
                      src={hasValidLogo(org) ? (() => {
                        try {
                          if (org.homepage) {
                            const url = new URL(org.homepage);
                            let domain = url.hostname;

                            // www. 제거
                            domain = domain.replace(/^www\./, '');

                            // 한글 이름을 영문 도메인으로 변환
                            const koreanToDomainMap: Record<string, string> = {
                              '제이펍': 'jpub.tistory.com',
                              '비제이퍼블릭': 'bjpublic.tistory.com',
                              '길벗': 'gilbut.co.kr',
                              '루비페이퍼': 'rubypaper.co.kr',
                              '인사이트': 'insightbook.co.kr',
                              '위키북스': 'wikibook.co.kr',
                              '영진닷컴': 'youngjin.com',
                              '생능출판사': 'booksr.co.kr',
                              '한빛미디어': 'hanbit.co.kr',
                              '골든래빗': 'goldenrabbit.co.kr',
                              '정보문화사': 'icc.co.kr',
                              '에이콘출판': 'acornpub.co.kr',
                              '책만': 'bookand.co.kr',
                              '파이토치 한국 사용자 모임': 'pytorch.kr'
                            };

                            if (koreanToDomainMap[org.name]) {
                              domain = koreanToDomainMap[org.name];
                            }

                            const logoPath = `/logos/${domain}.png`;
                            console.log(`Loading logo for ${org.name}: ${logoPath}`);
                            return logoPath;
                          }
                        } catch (error) {
                          console.warn(`Invalid homepage URL for ${org.name}:`, org.homepage, error);
                        }
                        return undefined;
                      })() : undefined}
                      alt={`${org.name} 로고`}
                      sx={{
                        width: 48,
                        height: 48,
                        mr: 2,
                        bgcolor: getTypeColor(org.type) === 'primary' ? 'primary.main' :
                                getTypeColor(org.type) === 'secondary' ? 'secondary.main' :
                                getTypeColor(org.type) === 'success' ? 'success.main' :
                                getTypeColor(org.type) === 'info' ? 'info.main' : 'primary.main',
                      }}
                      imgProps={{
                        onError: (e) => {
                          console.warn(`Failed to load logo for ${org.name}`);
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        },
                        onLoad: (e) => {
                          console.log(`Successfully loaded logo for ${org.name}`);
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'block';
                        },
                        style: {
                          objectFit: 'contain'
                        }
                      }}
                    >
                      {org.name.charAt(0)}
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                        {org.name}
                      </Typography>
                      <Chip
                        label={getTypeLabel(org.type)}
                        size="small"
                        color={getTypeColor(org.type)}
                        variant="outlined"
                      />
                    </Box>
                  </Box>

                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.6 }}>
                    {org.description}
                  </Typography>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    {org.homepage && (
                      <Link
                        href={org.homepage}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.5,
                          color: 'primary.main',
                          textDecoration: 'none',
                          '&:hover': {
                            textDecoration: 'underline',
                          },
                        }}
                      >
                        <House fontSize="small" />
                        홈페이지
                      </Link>
                    )}
                    {org.githubOrg && (
                      <Link
                        href={`https://github.com/${org.githubOrg}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.5,
                          color: 'text.secondary',
                          textDecoration: 'none',
                          '&:hover': {
                            textDecoration: 'underline',
                          },
                        }}
                      >
                        <GitHub fontSize="small" />
                        GitHub
                      </Link>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {organizations.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 8 }}>
            <Typography variant="h6" color="text.secondary">
              참여 중인 조직이 없습니다.
            </Typography>
          </Box>
        )}
      </Box>
    </Container>
  );
};

export default OrganizationsPage;

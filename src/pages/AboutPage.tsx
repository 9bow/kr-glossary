import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Container,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Breadcrumbs,
  Link as MuiLink,
  Avatar,
  Chip,
  Grid,
  Skeleton,
} from '@mui/material';
import { CheckCircle, Group, Book, Home, GitHub, Person } from '@mui/icons-material';
import { Link } from 'react-router-dom';
import { loadCoreMembers, type CoreMember } from '../utils/membersLoader';
import NotificationSettings from '../components/common/NotificationSettings';

const AboutPage: React.FC = () => {
  const [coreMembers, setCoreMembers] = useState<CoreMember[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);

  const features = [
    {
      icon: <Book />,
      title: '표준화된 용어',
      description: '커뮤니티 검증을 통해 표준화된 AI/ML 용어 번역 제공',
    },
    {
      icon: <Group />,
      title: '커뮤니티 기반',
      description: '전문가와 학습자들이 함께 참여하는 오픈소스 프로젝트',
    },
  ];

  // 구성원 데이터 로드
  useEffect(() => {
    const loadMembersData = async () => {
      try {
        setMembersLoading(true);
        const membersData = await loadCoreMembers();
        setCoreMembers(membersData);
      } catch (error) {
        console.error('Error loading core members:', error);
      } finally {
        setMembersLoading(false);
      }
    };

    loadMembersData();
  }, []);

  return (
    <Container>
      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 3 }}>
        <MuiLink component={Link} to="/" sx={{ display: 'flex', alignItems: 'center' }}>
          <Home sx={{ mr: 0.5 }} fontSize="inherit" />
          홈
        </MuiLink>
        <Typography color="text.primary">소개</Typography>
      </Breadcrumbs>

      <Box sx={{ py: 6 }}>
        <Typography variant="h3" sx={{ mb: 4, textAlign: 'center' }}>
          AI/ML 용어집 소개
        </Typography>

        <Typography variant="h6" sx={{ mb: 4, textAlign: 'center', color: 'text.secondary' }}>
          함께 만드는 한국어 AI/ML 용어집
        </Typography>

        <Typography variant="body1" sx={{ mb: 6, textAlign: 'center', maxWidth: 800, mx: 'auto' }}>
          AI/ML 용어집은 인공지능과 머신러닝 분야의 용어들을 한국어로 정확하게 번역하고,
          표준화하는 오픈소스 프로젝트입니다. 함께 만드는 한국어 AI/ML 용어집은
          전문가 검증과 커뮤니티 참여를 통해 신뢰할 수 있는 용어 사전을 구축합니다.
        </Typography>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' }, gap: 4 }}>
          {features.map((feature, index) => (
            <Card key={index} sx={{ height: '100%' }}>
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Box sx={{ color: 'primary.main', mr: 2 }}>
                    {feature.icon}
                  </Box>
                  <Typography variant="h6">{feature.title}</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  {feature.description}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Box>

        <Box sx={{ mt: 6 }}>
          <Typography variant="h5" sx={{ mb: 3 }}>
            참여 방법
          </Typography>
          <List>
            <ListItem>
              <ListItemIcon>
                <CheckCircle color="primary" />
              </ListItemIcon>
              <ListItemText
                primary="용어 검색 및 활용"
                secondary="표준화된 용어를 검색하고 학습 자료에서 활용"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CheckCircle color="primary" />
              </ListItemIcon>
              <ListItemText
                primary="용어 제안 및 수정"
                secondary="새로운 용어 제안이나 기존 용어의 개선사항 제출"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CheckCircle color="primary" />
              </ListItemIcon>
              <ListItemText
                primary="검증 참여"
                secondary="전문가로서 용어 검증 및 승인 작업 참여"
              />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CheckCircle color="primary" />
              </ListItemIcon>
              <ListItemText
                primary="코드 기여"
                secondary="플랫폼 개발에 직접 참여하여 기능 개선"
              />
            </ListItem>
          </List>
        </Box>

        {/* 구성원 섹션 */}
        <Box sx={{ mt: 8 }}>
          <Typography variant="h4" sx={{ mb: 3, textAlign: 'center' }}>
            구성원
          </Typography>
          <Typography variant="h6" sx={{ mb: 4, textAlign: 'center', color: 'text.secondary' }}>
            AI/ML 용어집을 운영하고 관리하는 핵심 멤버들
          </Typography>

          {membersLoading ? (
            <Grid container spacing={3}>
              {Array.from({ length: 4 }).map((_, index) => (
                <Grid size={{ xs: 12, sm: 6 }} key={index}>
                  <Card>
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Skeleton variant="circular" width={56} height={56} sx={{ mr: 2 }} />
                        <Box sx={{ flex: 1 }}>
                          <Skeleton variant="text" width={120} height={28} />
                          <Skeleton variant="text" width={80} height={24} />
                        </Box>
                      </Box>
                      <Skeleton variant="text" width="100%" height={20} />
                      <Skeleton variant="text" width="100%" height={20} />
                      <Skeleton variant="text" width="80%" height={20} />
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Grid container spacing={3}>
              {coreMembers.map((member) => (
                <Grid size={{ xs: 12, sm: 6 }} key={member.id}>
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
                          src={member.avatarUrl || `https://github.com/${member.githubUsername}.png`}
                          alt={member.name}
                          sx={{
                            width: 56,
                            height: 56,
                            mr: 2,
                            bgcolor: 'primary.main',
                          }}
                        >
                          <Person />
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                            {member.name}
                          </Typography>
                          <Chip
                            label={member.role}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        </Box>
                      </Box>

                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.6 }}>
                        {member.description}
                      </Typography>

                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                          주요 업무:
                        </Typography>
                        <Box component="ul" sx={{ m: 0, pl: 2 }}>
                          {member.responsibilities.slice(0, 2).map((responsibility, idx) => (
                            <Typography
                              key={idx}
                              component="li"
                              variant="body2"
                              color="text.secondary"
                              sx={{ mb: 0.5 }}
                            >
                              {responsibility}
                            </Typography>
                          ))}
                        </Box>
                      </Box>

                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">
                          참여일: {new Date(member.joinedAt).toLocaleDateString('ko-KR')}
                        </Typography>
                        <MuiLink
                          href={`https://github.com/${member.githubUsername}`}
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
                          <GitHub fontSize="small" sx={{ mr: 0.5 }} />
                          GitHub
                        </MuiLink>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>

        {/* 알림 설정 섹션 */}
        <Box sx={{ mt: 8 }}>
          <Typography variant="h4" sx={{ mb: 3, textAlign: 'center' }}>
            알림 설정
          </Typography>
          <Typography variant="h6" sx={{ mb: 4, textAlign: 'center', color: 'text.secondary' }}>
            새로운 용어 추가나 중요한 업데이트를 놓치지 마세요
          </Typography>
          
          <Box sx={{ maxWidth: 600, mx: 'auto' }}>
            <NotificationSettings />
          </Box>
        </Box>
      </Box>
    </Container>
  );
};

export default AboutPage;

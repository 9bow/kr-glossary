import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Container,
  Card,
  CardContent,
  Chip,
  Button,
  Divider,
  Alert,
  Skeleton,
  Breadcrumbs,
  Link as MuiLink,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  ArrowBack,
  Share,
  BookmarkBorder,
  VolumeUp,

  Person,
  AccessTime,
  Launch,
  Home,
} from '@mui/icons-material';
import { Link, useParams, useNavigate } from 'react-router-dom';
import type { Term } from '../types';
import { getTermByEnglish } from '../utils/dataLoader';

import GiscusComments from '../components/common/GiscusComments';


const TermDetailPage: React.FC = () => {
  const { english } = useParams<{ english: string }>();
  const navigate = useNavigate();

  const [term, setTerm] = useState<Term | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [relatedTerms, setRelatedTerms] = useState<Term[]>([]);


  // Load term data
  useEffect(() => {
    const loadTerm = async () => {
      if (!english) {
        setError('용어 영문명이 제공되지 않았습니다.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const termData = await getTermByEnglish(english);

        if (!termData) {
          setError('용어를 찾을 수 없습니다.');
          setLoading(false);
          return;
        }

        setTerm(termData);

        // Load related terms by English name
        if (termData.relatedTerms && termData.relatedTerms.length > 0) {
          const related = [];
          for (const relatedEnglish of termData.relatedTerms.slice(0, 3)) {
            const relatedTerm = await getTermByEnglish(relatedEnglish);
            if (relatedTerm) {
              related.push(relatedTerm);
            }
          }
          setRelatedTerms(related);
        }



        setError(null);
      } catch (err) {
        console.error('Error loading term:', err);
        setError('용어 데이터를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    loadTerm();
  }, [english]);

  // Text-to-speech functionality
  const speakText = (text: string, lang: 'ko' | 'en' = 'ko') => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang === 'ko' ? 'ko-KR' : 'en-US';
      utterance.rate = 0.8;
      utterance.pitch = 1;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Share functionality
  const handleShare = async () => {
    if (navigator.share && term) {
      try {
        await navigator.share({
          title: `${term.korean} - AI/ML 용어집`,
          text: `${term.korean}(${term.english}): ${term.definition?.korean || ''}`,
          url: window.location.href,
        });
      } catch {
        console.log('공유 취소 또는 지원되지 않음');
      }
    } else {
      // Copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      // TODO: Show toast message
    }
  };

  // Loading state
  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ py: 4 }}>
          <Skeleton variant="text" width={300} height={40} sx={{ mb: 2 }} />
          <Skeleton variant="rectangular" height={200} sx={{ mb: 3 }} />
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, gap: 3 }}>
            <Skeleton variant="rectangular" height={400} />
            <Skeleton variant="rectangular" height={300} />
          </Box>
        </Box>
      </Container>
    );
  }

  // Error state
  if (error || !term) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ py: 4 }}>
          <Alert severity="error" sx={{ mb: 3 }}>
            {error || '용어를 찾을 수 없습니다.'}
          </Alert>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate(-1)}
            variant="outlined"
          >
            뒤로 가기
          </Button>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 4 }}>
        {/* 브레드크럼 */}
        <Breadcrumbs sx={{ mb: 3 }}>
          <MuiLink component={Link} to="/" sx={{ display: 'flex', alignItems: 'center' }}>
            <Home sx={{ mr: 0.5 }} fontSize="inherit" />
            홈
          </MuiLink>
          <Typography color="text.primary">{term.korean}</Typography>
        </Breadcrumbs>

        {/* 헤더 섹션 */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Button
              startIcon={<ArrowBack />}
              onClick={() => navigate(-1)}
              variant="outlined"
              sx={{ mr: 2 }}
            >
              뒤로
            </Button>
            <Box sx={{ flex: 1 }} />
            <Tooltip title="공유하기">
              <IconButton onClick={handleShare} sx={{ mr: 1 }}>
                <Share />
              </IconButton>
            </Tooltip>
            <Tooltip title="북마크">
              <IconButton>
                <BookmarkBorder />
              </IconButton>
            </Tooltip>
          </Box>



          <Typography variant="h3" sx={{ mb: 1, fontWeight: 700 }}>
            {term.korean}
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Typography variant="h4" color="primary.main" sx={{ fontWeight: 500 }}>
              {term.english}
            </Typography>
            {term.pronunciation && (
              <>
                <Typography variant="body2" color="text.secondary">
                  {term.pronunciation}
                </Typography>
                <Tooltip title="발음 듣기">
                  <IconButton
                    size="small"
                    onClick={() => speakText(term.korean, 'ko')}
                  >
                    <VolumeUp fontSize="small" />
                  </IconButton>
                </Tooltip>
              </>
            )}
          </Box>

          {/* 메타 정보 */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, color: 'text.secondary' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Person fontSize="small" />
              <Typography variant="body2">
                기여자 {term.contributors?.length || 0}명
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <AccessTime fontSize="small" />
              <Typography variant="body2">
                {new Date(term.metadata.updatedAt).toLocaleDateString('ko-KR')}
              </Typography>
            </Box>
          </Box>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, gap: 4 }}>
          {/* 메인 콘텐츠 */}
          <Box>
            {/* 정의 섹션 */}
            <Card sx={{ mb: 3 }}>
              <CardContent sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  정의
                </Typography>

                {/* 여러 뜻이 있는 경우 */}
                {term.meanings && term.meanings.length > 0 ? (
                  term.meanings.map((meaning, index) => (
                    <Box key={meaning.id} sx={{ mb: index < term.meanings!.length - 1 ? 4 : 0 }}>
                      {/* 뜻 번호와 제목 */}
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Typography
                          variant="h6"
                          sx={{
                            mr: 2,
                            fontWeight: 700,
                            color: 'primary.main',
                            minWidth: '40px'
                          }}
                        >
                          {index + 1}.
                        </Typography>
                        <Box>
                          <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main' }}>
                            {meaning.title.korean}
                          </Typography>
                          <Typography variant="subtitle1" color="text.secondary" sx={{ fontStyle: 'italic', mt: 0.5 }}>
                            {meaning.title.english}
                          </Typography>
                        </Box>
                      </Box>

                      {/* 맥락 정보 */}
                      {meaning.context && (
                        <Box sx={{ mb: 2, pl: 5 }}>
                          <Typography variant="body2" sx={{
                            fontWeight: 500,
                            color: 'text.secondary',
                            backgroundColor: 'grey.50',
                            px: 2,
                            py: 1,
                            borderRadius: 1,
                            border: '1px solid',
                            borderColor: 'grey.200'
                          }}>
                            {meaning.context}
                          </Typography>
                        </Box>
                      )}

                      {/* 정의 */}
                      <Box sx={{ pl: 5, mb: 2 }}>
                        <Typography variant="body1" sx={{ lineHeight: 1.7, mb: 2 }}>
                          {meaning.definition.korean}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                          {meaning.definition.english}
                        </Typography>
                      </Box>

                      {/* 뜻 구분선 */}
                      {index < term.meanings!.length - 1 && (
                        <Divider sx={{
                          my: 3,
                          borderStyle: 'dashed',
                          borderColor: 'primary.light',
                          borderWidth: 1
                        }} />
                      )}
                    </Box>
                  ))
                ) : (
                  /* 단일 정의 (하위 호환성 유지) */
                  term.definition && (
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="body1" sx={{ mb: 2, lineHeight: 1.7 }}>
                        {term.definition.korean}
                      </Typography>
                      <Divider sx={{ my: 2 }} />
                      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                        {term.definition.english}
                      </Typography>
                    </Box>
                  )
                )}
              </CardContent>
            </Card>

            {/* 예시 섹션 */}
            {/* 여러 뜻의 예시들 통합 표시 */}
            {((term.meanings && term.meanings.some(m => m.examples && m.examples.length > 0)) ||
              (term.examples && term.examples.length > 0)) && (
              <Card sx={{ mb: 3 }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                    사용 예시
                  </Typography>

                  {/* 각 뜻별 예시 표시 */}
                  {term.meanings && term.meanings.map((meaning, meaningIndex) =>
                    meaning.examples && meaning.examples.length > 0 && (
                      <Box key={`meaning-${meaning.id}`} sx={{ mb: 4 }}>
                        <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600, color: 'primary.main' }}>
                          {meaningIndex + 1}. {meaning.title.korean}
                        </Typography>
                        {meaning.examples.map((example, index) => (
                          <Box key={`${meaning.id}-example-${index}`} sx={{ mb: 2, ml: 3 }}>
                            <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                              • {example.korean}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                              {example.english}
                            </Typography>
                            {example.source && (
                              <Box sx={{ mt: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Typography variant="caption" color="primary">
                                  출처:
                                </Typography>
                                {example.sourceUrl ? (
                                  <MuiLink
                                    href={example.sourceUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    variant="caption"
                                    color="primary"
                                    sx={{
                                      cursor: 'pointer',
                                      textDecoration: 'none',
                                      '&:hover': {
                                        textDecoration: 'underline',
                                      },
                                    }}
                                  >
                                    {example.source}
                                  </MuiLink>
                                ) : (
                                  <Typography variant="caption" color="primary">
                                    {example.source}
                                  </Typography>
                                )}
                                {example.sourceUrl && (
                                  <Tooltip title="링크 열기">
                                    <IconButton
                                      size="small"
                                      href={example.sourceUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      sx={{ p: 0.5 }}
                                    >
                                      <Launch fontSize="inherit" />
                                    </IconButton>
                                  </Tooltip>
                                )}
                              </Box>
                            )}
                          </Box>
                        ))}
                      </Box>
                    )
                  )}

                  {/* 기존 예시들 (단일 정의 호환성) */}
                  {term.examples && term.examples.length > 0 && (
                    <Box>
                      <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600, color: 'primary.main' }}>
                        일반
                      </Typography>
                      {term.examples.map((example, index) => (
                        <Box key={`general-example-${index}`} sx={{ mb: 2, ml: 2 }}>
                          <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                            • {example.korean}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                            {example.english}
                          </Typography>
                          {example.source && (
                            <Box sx={{ mt: 0.5, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Typography variant="caption" color="primary">
                                출처:
                              </Typography>
                              {example.sourceUrl ? (
                                <MuiLink
                                  href={example.sourceUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  variant="caption"
                                  color="primary"
                                  sx={{
                                    cursor: 'pointer',
                                    textDecoration: 'none',
                                    '&:hover': {
                                      textDecoration: 'underline',
                                    },
                                  }}
                                >
                                  {example.source}
                                </MuiLink>
                              ) : (
                                <Typography variant="caption" color="primary">
                                  {example.source}
                                </Typography>
                              )}
                              {example.sourceUrl && (
                                <Tooltip title="링크 열기">
                                  <IconButton
                                    size="small"
                                    href={example.sourceUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    sx={{ p: 0.5 }}
                                  >
                                    <Launch fontSize="inherit" />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </Box>
                          )}
                        </Box>
                      ))}
                    </Box>
                  )}
                </CardContent>
              </Card>
            )}

            {/* 참고문헌 섹션 */}
            {/* 여러 뜻의 참조들 통합 표시 */}
            {((term.meanings && term.meanings.some(m => m.references && m.references.length > 0)) ||
              (term.references && term.references.length > 0)) && (
              <Card sx={{ mb: 3 }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                    참고문헌
                  </Typography>

                  {/* 각 뜻별 참조 표시 */}
                  {term.meanings && term.meanings.map((meaning, meaningIndex) =>
                    meaning.references && meaning.references.length > 0 && (
                      <Box key={`meaning-${meaning.id}-refs`} sx={{ mb: 4 }}>
                        <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600, color: 'primary.main' }}>
                          {meaningIndex + 1}. {meaning.title.korean}
                        </Typography>
                        {meaning.references.map((reference, index) => (
                          <Box key={`${meaning.id}-ref-${index}`} sx={{ mb: 2, ml: 3 }}>
                            <Typography variant="body2" sx={{ mb: 0.5 }}>
                              {reference.title}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
                              <Chip
                                label={reference.type}
                                size="small"
                                variant="outlined"
                              />
                              {reference.year && (
                                <Typography variant="caption">
                                  {reference.year}
                                </Typography>
                              )}
                              {reference.url && (
                                <Tooltip title="링크 열기">
                                  <IconButton
                                    size="small"
                                    href={reference.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <Launch fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </Box>
                          </Box>
                        ))}
                      </Box>
                    )
                  )}

                  {/* 기존 참조들 (단일 정의 호환성) */}
                  {term.references && term.references.length > 0 && (
                    <Box>
                      <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600, color: 'primary.main' }}>
                        일반
                      </Typography>
                      {term.references.map((reference, index) => (
                        <Box key={`general-ref-${index}`} sx={{ mb: 2, ml: 2 }}>
                          <Typography variant="body2" sx={{ mb: 0.5 }}>
                            {reference.title}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
                            <Chip
                              label={reference.type}
                              size="small"
                              variant="outlined"
                            />
                            {reference.year && (
                              <Typography variant="caption">
                                {reference.year}
                              </Typography>
                            )}
                            {reference.url && (
                              <Tooltip title="링크 열기">
                                <IconButton
                                size="small"
                                href={reference.url}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <Launch fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            )}
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  )}
                </CardContent>
              </Card>
            )}
          </Box>

          {/* 사이드바 */}
          <Box>
            {/* 관련 용어 */}
            {relatedTerms.length > 0 && (
              <Card sx={{ mb: 3 }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                    관련 용어
                  </Typography>
                  {relatedTerms.map((relatedTerm) => (
                    <Box key={relatedTerm.english} sx={{ mb: 2 }}>
                      <Button
                        component={Link}
                        to={`/terms/${encodeURIComponent(relatedTerm.english)}`}
                        fullWidth
                        variant="outlined"
                        sx={{
                          justifyContent: 'flex-start',
                          textAlign: 'left',
                          py: 1,
                        }}
                      >
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {relatedTerm.korean}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {relatedTerm.english}
                          </Typography>
                        </Box>
                      </Button>
                    </Box>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* 기여자 정보 */}
            {term.contributors && term.contributors.length > 0 && (
              <Card>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                    기여자
                  </Typography>
                  {term.contributors.map((contributor, index) => (
                    <Box key={index} sx={{ mb: 1 }}>
                      <Typography variant="body2">
                        {contributor.githubUsername}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {contributor.contributionType} • {new Date(contributor.timestamp).toLocaleDateString('ko-KR')}
                      </Typography>
                    </Box>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* GitHub Pull Request 링크 */}
            {term.metadata?.discussionUrl && (
              <Card>
                <CardContent sx={{ p: 3 }}>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                    관련 논의
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      이 용어에 대한 논의와 검증 과정을 확인하세요:
                    </Typography>
                    <MuiLink
                      href={term.metadata.discussionUrl}
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
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        GitHub Discussion
                      </Typography>
                      <Launch fontSize="small" />
                    </MuiLink>
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    Pull Request에서 용어 검증 과정과 커뮤니티 의견을 확인할 수 있습니다.
                  </Typography>
                </CardContent>
              </Card>
            )}
          </Box>
        </Box>

        {/* Giscus 댓글 시스템 */}
        <GiscusComments
          termId={term.english}
          termTitle={`${term.korean} (${term.english})`}
        />
      </Box>
    </Container>
  );
};

export default TermDetailPage;

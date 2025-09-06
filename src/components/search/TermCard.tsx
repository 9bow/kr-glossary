import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Chip,
  Box,
  IconButton,
  Tooltip,
  useTheme,
} from '@mui/material';
import {
  Person,
  AccessTime,
  CopyAll,
  Launch,
  TrendingUp,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import type { Term } from '../../types';

interface TermCardProps {
  term: Term;
  variant?: 'default' | 'compact' | 'search';
  showValidation?: boolean;
  showActions?: boolean;
  highlightQuery?: string;
  showScore?: boolean;
  score?: number;
  onClick?: () => void;
}

const TermCard: React.FC<TermCardProps> = ({
  term,
  variant = 'default',
  showValidation = false,
  showActions = true,
  highlightQuery,
  showScore = false,
  score,
  onClick,
}) => {
  const theme = useTheme();
  const navigate = useNavigate();

  const handleCardClick = () => {
    if (onClick) {
      onClick();
    } else {
      navigate(`/terms/${encodeURIComponent(term.english)}`);
    }
  };

  const handleCopyTerm = (event: React.MouseEvent) => {
    event.stopPropagation();
    const textToCopy = `${term.english} (${term.korean})`;
    navigator.clipboard.writeText(textToCopy);
    // TODO: 토스트 메시지 표시
  };

  const handleOpenTerm = (event: React.MouseEvent) => {
    event.stopPropagation();
    navigate(`/terms/${encodeURIComponent(term.english)}`);
  };

  // 검색어 하이라이팅을 위한 텍스트 처리 (개선됨)
  const highlightText = (text: string, query: string): React.ReactNode => {
    if (!query || !text) return text;

    try {
      // 특수문자 이스케이프 및 다중 공백 처리
      const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').trim();
      if (!escapedQuery) return text;

      // 대소문자 구분 없는 검색을 위한 정규식
      const regex = new RegExp(`(${escapedQuery})`, 'gi');

      // 텍스트를 분할
      const parts = text.split(regex);

      // 하이라이트된 텍스트 생성
      return parts.map((part, index) => {
        if (regex.test(part)) {
          return (
            <Box
              key={index}
              component="mark"
              sx={{
                backgroundColor: 'warning.main',
                color: 'warning.contrastText',
                px: 0.5,
                py: 0.25,
                borderRadius: 0.5,
                fontWeight: 'bold',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              }}
            >
              {part}
            </Box>
          );
        }
        return part;
      });
    } catch (error) {
      // 정규식 오류 시 원본 텍스트 반환
      console.warn('Highlighting error:', error);
      return text;
    }
  };



  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (variant === 'compact') {
    return (
      <Card
        sx={{
          cursor: 'pointer',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: theme.shadows[4],
          },
        }}
        onClick={handleCardClick}
      >
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Typography variant="h6">
                  {highlightQuery ? highlightText(term.english, highlightQuery) : term.english}
                </Typography>
                {showScore && score !== undefined && (
                  <Chip 
                    icon={<TrendingUp fontSize="small" />}
                    label={`${(score * 100).toFixed(0)}%`}
                    size="small"
                    color="primary"
                    variant="outlined"
                    sx={{ fontSize: '0.7rem', height: '20px' }}
                  />
                )}
              </Box>
              <Typography variant="body2" color="text.secondary">
                {highlightQuery ? highlightText(term.korean, highlightQuery) : term.korean}
              </Typography>
              {/* 상태 표시 */}
              {showValidation && (
                <Box sx={{ mt: 0.5 }}>
                  <Chip
                    label={term.status === 'validated' ? '검증완료' : 
                           term.status === 'proposed' ? '제안됨' : '초안'}
                    size="small"
                    color={term.status === 'validated' ? 'success' : 
                           term.status === 'proposed' ? 'warning' : 'info'}
                    variant="outlined"
                    sx={{ fontSize: '0.7rem', height: '18px' }}
                  />
                </Box>
              )}
            </Box>

          </Box>
        </CardContent>
      </Card>
    );
  }

  if (variant === 'search') {
    return (
      <Card
        sx={{
          cursor: 'pointer',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            backgroundColor: 'action.hover',
          },
        }}
        onClick={handleCardClick}
      >
        <CardContent sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Typography variant="h6">
                  {highlightQuery ? highlightText(term.english, highlightQuery) : term.english}
                </Typography>
                {showScore && score !== undefined && (
                  <Chip 
                    icon={<TrendingUp fontSize="small" />}
                    label={`관련도 ${(score * 100).toFixed(0)}%`}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                )}
              </Box>

              <Typography variant="subtitle1" color="primary" sx={{ mb: 1 }}>
                {highlightQuery ? highlightText(term.korean, highlightQuery) : term.korean}
              </Typography>

              {term.pronunciation && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  발음: {term.pronunciation}
                </Typography>
              )}

              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                }}
              >
                {term.meanings && term.meanings.length > 0 
                  ? term.meanings[0].definition.korean 
                  : term.definition?.korean}
              </Typography>

              {term.meanings && term.meanings.length > 1 && (
                <Typography 
                  variant="caption" 
                  color="primary.main" 
                  sx={{ 
                    mt: 0.5,
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5
                  }}
                >
                  +{term.meanings.length - 1}개의 다른 뜻
                </Typography>
              )}

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Person fontSize="small" color="action" />
                  <Typography variant="caption" color="text.secondary">
                    {term.contributors?.length || 0}명의 기여자
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <AccessTime fontSize="small" color="action" />
                  <Typography variant="caption" color="text.secondary">
                    {formatDate(term.metadata.updatedAt)}
                  </Typography>
                </Box>
              </Box>
            </Box>

            {showActions && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <Tooltip title="용어 복사">
                  <IconButton size="small" onClick={handleCopyTerm}>
                    <CopyAll fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="상세 보기">
                  <IconButton size="small" onClick={handleOpenTerm}>
                    <Launch fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            )}
          </Box>
        </CardContent>
      </Card>
    );
  }

  // Default variant
  return (
    <Card
      sx={{
        height: '100%',
        cursor: 'pointer',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: theme.shadows[8],
        },
      }}
      onClick={handleCardClick}
    >
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              {highlightQuery ? highlightText(term.english, highlightQuery) : term.english}
            </Typography>
            {showScore && score !== undefined && (
              <Chip 
                icon={<TrendingUp fontSize="small" />}
                label={`${(score * 100).toFixed(0)}%`}
                size="small"
                color="primary"
              />
            )}
          </Box>

          <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>
            {highlightQuery ? highlightText(term.korean, highlightQuery) : term.korean}
          </Typography>

          {/* 상태 표시 */}
          {showValidation && (
            <Box sx={{ mb: 2 }}>
              <Chip
                label={term.status === 'validated' ? '검증완료' : 
                       term.status === 'proposed' ? '제안됨' : '초안'}
                size="small"
                color={term.status === 'validated' ? 'success' : 
                       term.status === 'proposed' ? 'warning' : 'info'}
                variant="outlined"
              />
            </Box>
          )}

          {term.pronunciation && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              발음: {term.pronunciation}
            </Typography>
          )}
        </Box>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            mb: 2,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            lineHeight: 1.6,
          }}
        >
          {term.meanings && term.meanings.length > 0 
            ? term.meanings[0].definition.korean 
            : term.definition?.korean}
        </Typography>

        {term.meanings && term.meanings.length > 1 && (
          <Typography 
            variant="body2" 
            color="primary.main" 
            sx={{ 
              mb: 2,
              fontWeight: 500
            }}
          >
            +{term.meanings.length - 1}개의 다른 뜻 있음
          </Typography>
        )}

        {term.examples && term.examples.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>
              예시:
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                fontStyle: 'italic',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
              }}
            >
              {term.examples[0].korean}
            </Typography>
          </Box>
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Person fontSize="small" color="action" />
              <Typography variant="caption" color="text.secondary">
                {term.contributors?.length || 0}명
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <AccessTime fontSize="small" color="action" />
              <Typography variant="caption" color="text.secondary">
                {formatDate(term.metadata.updatedAt)}
              </Typography>
            </Box>
          </Box>

          {showActions && (
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <Tooltip title="용어 복사">
                <IconButton size="small" onClick={handleCopyTerm}>
                  <CopyAll fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="상세 보기">
                <IconButton size="small" onClick={handleOpenTerm}>
                  <Launch fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default TermCard;

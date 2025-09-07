import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Container,
  Card,
  CardContent,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { getRecentTerms } from '../../utils/dataLoader';
import type { Term } from '../../types';

interface RecentTermsSectionProps {
  limit?: number;
}

const RecentTermsSection: React.FC<RecentTermsSectionProps> = ({ limit = 5 }) => {
  const navigate = useNavigate();
  const [recentTerms, setRecentTerms] = useState<Term[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRecentTerms = async () => {
      try {
        setLoading(true);
        const terms = await getRecentTerms(limit);
        setRecentTerms(terms);
      } catch (error) {
        console.error('Failed to load recent terms:', error);
        setRecentTerms([]);
      } finally {
        setLoading(false);
      }
    };

    loadRecentTerms();
  }, [limit]);

  // 용어가 없거나 로딩 중이면 렌더링하지 않음
  if (loading || recentTerms.length === 0) {
    return null;
  }

  return (
    <Container sx={{ py: 4, backgroundColor: 'background.default' }}>
      <Typography variant="h4" sx={{ mb: 4, textAlign: 'center', fontWeight: 600 }}>
        신규 등록 용어
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 3 }}>
        {recentTerms.map((term) => (
          <Card
            key={term.id}
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
  );
};

export default RecentTermsSection;
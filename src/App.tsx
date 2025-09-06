import { StrictMode, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline, Box, CircularProgress, Typography } from '@mui/material';
import { createAppTheme } from './styles/theme';
import { useTheme } from './hooks/useTheme';
import { useMemoryManager } from './hooks/useMemoryManager';
import { errorHandler } from './utils/errorHandler';
import Layout from './components/layout/Layout';

// Lazy-loaded components for code splitting
const HomePage = lazy(() => import('./pages/HomePage'));
const SearchPage = lazy(() => import('./pages/SearchPage'));
const TermsPage = lazy(() => import('./pages/TermsPage'));
const TermDetailPage = lazy(() => import('./pages/TermDetailPage'));
const ContributePage = lazy(() => import('./pages/ContributePage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const OrganizationsPage = lazy(() => import('./pages/OrganizationsPage'));
const ContributorsPage = lazy(() => import('./pages/ContributorsPage'));

// Loading component
const LoadingFallback = () => (
  <Box
    sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '400px',
      gap: 2,
    }}
  >
    <CircularProgress size={40} />
    <Typography variant="body1" color="text.secondary">
      로딩 중...
    </Typography>
  </Box>
);

// Separate component for content that uses hooks after providers are set up
function AppContent() {
  // Hooks must be called inside the component function, after providers
  const { getCurrentMode } = useTheme();
  const currentTheme = getCurrentMode();

  // Initialize memory management
  useMemoryManager();

  return (
    <ThemeProvider theme={createAppTheme(currentTheme)}>
      <CssBaseline />
      <Router>
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<HomePage />} />
              <Route path="search" element={<SearchPage />} />
              <Route path="terms" element={<TermsPage />} />
              <Route path="terms/:english" element={<TermDetailPage />} />
              <Route path="contribute" element={<ContributePage />} />
              <Route path="about" element={<AboutPage />} />
              <Route path="organizations" element={<OrganizationsPage />} />
              <Route path="contributors" element={<ContributorsPage />} />
              {/* Catch all route for 404 */}
              <Route path="*" element={<HomePage />} />
            </Route>
          </Routes>
        </Suspense>
      </Router>
    </ThemeProvider>
  );
}

function App() {
  const ErrorBoundary = errorHandler.createErrorBoundary();

  return (
    <StrictMode>
      <ErrorBoundary>
        <AppContent />
      </ErrorBoundary>
    </StrictMode>
  );
}

export default App;

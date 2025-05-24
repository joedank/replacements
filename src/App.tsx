import React, { lazy, Suspense } from 'react';
import { ConfigProvider, theme, message, Modal, Spin } from 'antd';
import { MainLayout } from './components/layout';
import { ReplacementProvider, useReplacements } from './contexts/ReplacementContext';
import { ProjectProvider } from './contexts/ProjectContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { VariablesProvider } from './contexts/VariablesContext';
import { DebugPanel } from './components/debug';

// Lazy load components to split them into separate chunks
const Dashboard = lazy(() => import('./components/dashboard').then(m => ({ default: m.Dashboard })));
const ReplacementEditor = lazy(() => import('./components/replacements').then(m => ({ default: m.ReplacementEditor })));
const CategoryReplacements = lazy(() => import('./components/replacements').then(m => ({ default: m.CategoryReplacements })));
const GeneralSettings = lazy(() => import('./components/settings').then(m => ({ default: m.GeneralSettings })));
const Projects = lazy(() => import('./components/projects').then(m => ({ default: m.Projects })));
const CategorySettings = lazy(() => import('./components/categories').then(m => ({ default: m.CategorySettings })));

// Loading component for lazy-loaded components
const LoadingFallback = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
    <Spin size="large" />
  </div>
);

function AppContent() {
  const { selectedReplacement, selectedMenuItem } = useReplacements();
  
  // Render different content based on selected menu item
  if (selectedMenuItem === 'general-settings') {
    return (
      <MainLayout>
        <Suspense fallback={<LoadingFallback />}>
          <GeneralSettings />
        </Suspense>
      </MainLayout>
    );
  }
  
  if (selectedMenuItem === 'category-settings') {
    return (
      <MainLayout>
        <Suspense fallback={<LoadingFallback />}>
          <CategorySettings />
        </Suspense>
      </MainLayout>
    );
  }
  
  if (selectedMenuItem === 'projects') {
    return (
      <MainLayout>
        <Suspense fallback={<LoadingFallback />}>
          <Projects />
        </Suspense>
      </MainLayout>
    );
  }
  
  // Handle category selection
  if (selectedMenuItem.startsWith('category-')) {
    const categoryId = selectedMenuItem.replace('category-', '');
    return (
      <MainLayout>
        <Suspense fallback={<LoadingFallback />}>
          <CategoryReplacements categoryId={categoryId} />
        </Suspense>
      </MainLayout>
    );
  }
  
  return (
    <MainLayout>
      <Suspense fallback={<LoadingFallback />}>
        {selectedReplacement ? <ReplacementEditor /> : <Dashboard />}
      </Suspense>
    </MainLayout>
  );
}

function ThemedApp() {
  const { actualTheme } = useTheme();
  
  // Add theme class to body for CSS styling
  React.useEffect(() => {
    if (actualTheme === 'dark') {
      document.body.classList.add('dark');
      document.documentElement.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
      document.documentElement.classList.remove('dark');
    }
  }, [actualTheme]);

  // Configure static methods to use the current theme
  const [, messageContextHolder] = message.useMessage();
  const [, modalContextHolder] = Modal.useModal();
  
  return (
    <ConfigProvider
      theme={{
        algorithm: actualTheme === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          // Use our design tokens where appropriate
          colorPrimary: '#4a00ff', // Our purple primary color
          colorSuccess: '#10b981', // Our accent color
          colorWarning: '#f59e0b',
          colorError: '#ef4444',
          
          // Typography
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          fontSize: 16,
          
          // Spacing and sizing
          borderRadius: 6,
          wireframe: false,
        },
        components: {
          Layout: {
            headerBg: actualTheme === 'dark' ? '#141414' : '#ffffff',
            bodyBg: actualTheme === 'dark' ? '#000000' : '#f9fafb',
            siderBg: actualTheme === 'dark' ? '#141414' : '#ffffff',
          },
          Menu: {
            itemBg: 'transparent',
            itemSelectedBg: actualTheme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : '#f0f5ff',
            itemHoverBg: actualTheme === 'dark' ? 'rgba(255, 255, 255, 0.04)' : '#f5f5f5',
          },
          Message: {
            contentBg: actualTheme === 'dark' ? '#1f1f1f' : '#ffffff',
            colorText: actualTheme === 'dark' ? '#ffffff' : '#000000',
          },
          Modal: {
            contentBg: actualTheme === 'dark' ? '#1f1f1f' : '#ffffff',
            headerBg: actualTheme === 'dark' ? '#1f1f1f' : '#ffffff',
            colorText: actualTheme === 'dark' ? '#ffffff' : '#000000',
          },
        },
      }}
    >
      {messageContextHolder}
      {modalContextHolder}
      <ReplacementProvider>
        <ProjectProvider>
          <VariablesProvider>
            <AppContent />
            <DebugPanel />
          </VariablesProvider>
        </ProjectProvider>
      </ReplacementProvider>
    </ConfigProvider>
  );
}

function App() {
  return (
    <ThemeProvider>
      <ThemedApp />
    </ThemeProvider>
  );
}

export default App;
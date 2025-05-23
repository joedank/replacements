import { ConfigProvider, theme } from 'antd';
import { MainLayout } from './components/layout';
import { Dashboard } from './components/dashboard';
import { ReplacementEditor } from './components/replacements';
import { GeneralSettings } from './components/settings';
import { ReplacementProvider, useReplacements } from './contexts/ReplacementContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';

function AppContent() {
  const { selectedReplacement, selectedMenuItem } = useReplacements();
  
  // Render different content based on selected menu item
  if (selectedMenuItem === 'general-settings') {
    return (
      <MainLayout>
        <GeneralSettings />
      </MainLayout>
    );
  }
  
  return (
    <MainLayout>
      {selectedReplacement ? <ReplacementEditor /> : <Dashboard />}
    </MainLayout>
  );
}

function ThemedApp() {
  const { actualTheme } = useTheme();
  
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
        },
      }}
    >
      <ReplacementProvider>
        <AppContent />
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
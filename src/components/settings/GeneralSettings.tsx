import React from 'react';
import { Typography, Radio, Space, Card, Divider } from 'antd';
import { BulbOutlined, MoonOutlined, DesktopOutlined } from '@ant-design/icons';
import { useTheme } from '../../contexts/ThemeContext';

const { Title, Text } = Typography;

export const GeneralSettings: React.FC = () => {
  const { themeMode, setThemeMode } = useTheme();

  return (
    <div>
      <Title level={2}>General Settings</Title>
      
      <Card>
        <Title level={4}>Appearance</Title>
        <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
          Choose how BetterReplacementsManager looks to you. Select a theme, or sync with your system settings.
        </Text>
        
        <Radio.Group 
          value={themeMode} 
          onChange={(e) => setThemeMode(e.target.value)}
          style={{ width: '100%' }}
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            <Radio value="light" style={{ padding: '12px 0' }}>
              <Space>
                <BulbOutlined style={{ fontSize: 18 }} />
                <div>
                  <div style={{ fontWeight: 500 }}>Light</div>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Light background with dark text
                  </Text>
                </div>
              </Space>
            </Radio>
            
            <Radio value="dark" style={{ padding: '12px 0' }}>
              <Space>
                <MoonOutlined style={{ fontSize: 18 }} />
                <div>
                  <div style={{ fontWeight: 500 }}>Dark</div>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Dark background with light text
                  </Text>
                </div>
              </Space>
            </Radio>
            
            <Radio value="auto" style={{ padding: '12px 0' }}>
              <Space>
                <DesktopOutlined style={{ fontSize: 18 }} />
                <div>
                  <div style={{ fontWeight: 500 }}>System</div>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Automatically match your system theme
                  </Text>
                </div>
              </Space>
            </Radio>
          </Space>
        </Radio.Group>
      </Card>
      
      <Divider />
      
      <Card style={{ marginTop: 16 }}>
        <Title level={4}>More Settings Coming Soon</Title>
        <Text type="secondary">
          Additional preferences and configuration options will be added here in future updates.
        </Text>
      </Card>
    </div>
  );
};

export default GeneralSettings;
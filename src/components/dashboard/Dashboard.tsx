import React from 'react';
import { Card, Row, Col, Statistic, Progress } from 'antd';
import { 
  FileTextOutlined, 
  ProjectOutlined, 
  FileOutlined, 
  ThunderboltOutlined 
} from '@ant-design/icons';

const Dashboard: React.FC = () => {
  return (
    <div>
      <h1>Dashboard</h1>
      <p>Welcome to BetterReplacementsManager - your text replacement and AI template management hub.</p>
      
      <Row gutter={[16, 16]} style={{ marginTop: '24px' }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Replacements"
              value={142}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Active Projects"
              value={8}
              prefix={<ProjectOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="AI Templates"
              value={23}
              prefix={<FileOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Usage This Week"
              value={89}
              prefix={<ThunderboltOutlined />}
              suffix="%"
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: '24px' }}>
        <Col xs={24} lg={12}>
          <Card title="Recent Activity" bordered={false}>
            <p>• Created new snippet: "react-component-template"</p>
            <p>• Updated project: "Personal Productivity"</p>
            <p>• Added AI template: "Code documentation prompt"</p>
            <p>• Synced with Espanso configuration</p>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Quick Stats" bordered={false}>
            <div style={{ marginBottom: '16px' }}>
              <p>Storage Usage</p>
              <Progress percent={30} status="active" />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <p>Espanso Sync Status</p>
              <Progress percent={100} status="success" />
            </div>
            <div>
              <p>Templates Organized</p>
              <Progress percent={75} />
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;

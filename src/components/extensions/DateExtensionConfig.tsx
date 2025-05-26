import React, { useState, useEffect } from 'react';
import {
  Form,
  Input,
  Select,
  Space,
  Typography,
  Card,
  Row,
  Col,
  InputNumber,
  Tag,
  Tooltip,
  Divider,
} from 'antd';
import {
  CalendarOutlined,
  PlusOutlined,
  MinusOutlined,
} from '@ant-design/icons';
import { DateExtension, COMMON_DATE_FORMATS, COMMON_DATE_OFFSETS } from '../../types/extensions';

const { Text } = Typography;
const { Option } = Select;

interface DateExtensionConfigProps {
  extension?: DateExtension;
  onChange: (extension: DateExtension) => void;
  onVariableNameChange: (name: string) => void;
}

// Additional format components for building custom formats
const FORMAT_COMPONENTS = [
  { label: 'Year', formats: [
    { code: '%Y', desc: '4-digit year (2023)' },
    { code: '%y', desc: '2-digit year (23)' },
  ]},
  { label: 'Month', formats: [
    { code: '%m', desc: 'Month number (01-12)' },
    { code: '%B', desc: 'Full month name (January)' },
    { code: '%b', desc: 'Abbreviated month (Jan)' },
  ]},
  { label: 'Day', formats: [
    { code: '%d', desc: 'Day of month (01-31)' },
    { code: '%e', desc: 'Day of month (1-31)' },
    { code: '%j', desc: 'Day of year (001-366)' },
  ]},
  { label: 'Weekday', formats: [
    { code: '%A', desc: 'Full weekday (Monday)' },
    { code: '%a', desc: 'Abbreviated weekday (Mon)' },
    { code: '%w', desc: 'Weekday number (0-6)' },
  ]},
  { label: 'Time', formats: [
    { code: '%H', desc: '24-hour (00-23)' },
    { code: '%I', desc: '12-hour (01-12)' },
    { code: '%M', desc: 'Minute (00-59)' },
    { code: '%S', desc: 'Second (00-60)' },
    { code: '%p', desc: 'AM/PM' },
  ]},
  { label: 'Other', formats: [
    { code: '%c', desc: 'Complete date and time' },
    { code: '%x', desc: 'Date representation' },
    { code: '%X', desc: 'Time representation' },
    { code: '%%', desc: 'Literal % character' },
  ]},
];

export const DateExtensionConfig: React.FC<DateExtensionConfigProps> = ({
  extension,
  onChange,
  onVariableNameChange,
}) => {
  const [form] = Form.useForm();
  const [format, setFormat] = useState(extension?.params.format || '%Y-%m-%d');
  const [offset, setOffset] = useState<number | 'custom'>(extension?.params.offset || 0);
  const [locale, setLocale] = useState(extension?.params.locale || '');
  const [customFormat, setCustomFormat] = useState('');
  const [offsetUnit, setOffsetUnit] = useState<'seconds' | 'minutes' | 'hours' | 'days'>('days');
  const [offsetValue, setOffsetValue] = useState(0);

  useEffect(() => {
    // Convert offset to appropriate unit for display
    if (typeof offset === 'number' && offset !== 0) {
      const absOffset = Math.abs(offset);
      if (absOffset % 86400 === 0) {
        setOffsetUnit('days');
        setOffsetValue((typeof offset === 'number' ? offset : 0) / 86400);
      } else if (absOffset % 3600 === 0) {
        setOffsetUnit('hours');
        setOffsetValue((typeof offset === 'number' ? offset : 0) / 3600);
      } else if (absOffset % 60 === 0) {
        setOffsetUnit('minutes');
        setOffsetValue((typeof offset === 'number' ? offset : 0) / 60);
      } else {
        setOffsetUnit('seconds');
        setOffsetValue(typeof offset === 'number' ? offset : 0);
      }
    }
  }, [offset]);

  useEffect(() => {
    const ext: DateExtension = {
      name: form.getFieldValue('name') || 'date',
      type: 'date',
      params: {
        format,
        ...(offset !== 0 && offset !== 'custom' && { offset }),
        ...(locale && { locale }),
      },
    };
    onChange(ext);
  }, [format, offset, locale, form, onChange]);

  const handleOffsetChange = (value: number, unit: string) => {
    let newOffset = value;
    switch (unit) {
      case 'minutes':
        newOffset = value * 60;
        break;
      case 'hours':
        newOffset = value * 3600;
        break;
      case 'days':
        newOffset = value * 86400;
        break;
    }
    setOffset(newOffset);
    setOffsetValue(value);
    setOffsetUnit(unit as any);
  };

  const insertFormatComponent = (code: string) => {
    if (customFormat) {
      setCustomFormat(customFormat + code);
      setFormat(customFormat + code);
    } else {
      setCustomFormat(format + code);
      setFormat(format + code);
    }
  };

  const previewDate = () => {
    const now = new Date();
    const targetDate = new Date(now.getTime() + ((typeof offset === 'number' ? offset : 0) * 1000));
    
    try {
      // This is a simplified preview - actual Espanso formatting is more complex
      let preview = format;
      // const options: Intl.DateTimeFormatOptions = {};
      
      // Basic format replacements for preview
      preview = preview.replace('%Y', targetDate.getFullYear().toString());
      preview = preview.replace('%y', targetDate.getFullYear().toString().slice(-2));
      preview = preview.replace('%m', String(targetDate.getMonth() + 1).padStart(2, '0'));
      preview = preview.replace('%d', String(targetDate.getDate()).padStart(2, '0'));
      preview = preview.replace('%H', String(targetDate.getHours()).padStart(2, '0'));
      preview = preview.replace('%M', String(targetDate.getMinutes()).padStart(2, '0'));
      preview = preview.replace('%S', String(targetDate.getSeconds()).padStart(2, '0'));
      preview = preview.replace('%B', targetDate.toLocaleString('en-US', { month: 'long' }));
      preview = preview.replace('%b', targetDate.toLocaleString('en-US', { month: 'short' }));
      preview = preview.replace('%A', targetDate.toLocaleString('en-US', { weekday: 'long' }));
      preview = preview.replace('%a', targetDate.toLocaleString('en-US', { weekday: 'short' }));
      
      return preview;
    } catch {
      return 'Invalid format';
    }
  };

  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={{
        name: extension?.name || 'date',
      }}
      onValuesChange={(_, values) => {
        if (values.name) {
          onVariableNameChange(values.name);
        }
      }}
    >
      <Form.Item
        name="name"
        label="Variable Name"
        rules={[{ required: true, message: 'Please enter a variable name' }]}
      >
        <Input
          placeholder="e.g., today, current_time, timestamp"
          prefix={<CalendarOutlined />}
        />
      </Form.Item>

      <Card title="Date Format" size="small" style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Select
            value={format}
            onChange={(value) => {
              setFormat(value);
              setCustomFormat('');
            }}
            style={{ width: '100%' }}
            placeholder="Select a format or create custom"
          >
            <Option value="custom">Custom Format</Option>
            <Divider style={{ margin: '8px 0' }} />
            {COMMON_DATE_FORMATS.map((fmt) => (
              <Option key={fmt.value} value={fmt.value}>
                <Space>
                  <Text code>{fmt.value}</Text>
                  <Text type="secondary">{fmt.label}</Text>
                </Space>
              </Option>
            ))}
          </Select>

          {format === 'custom' && (
            <>
              <Input
                value={customFormat}
                onChange={(e) => {
                  setCustomFormat(e.target.value);
                  setFormat(e.target.value);
                }}
                placeholder="Enter custom format (e.g., %Y-%m-%d %H:%M)"
              />
              
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Click to insert format components:
                </Text>
                {FORMAT_COMPONENTS.map((group) => (
                  <div key={group.label} style={{ marginTop: 8 }}>
                    <Text strong style={{ fontSize: 12 }}>{group.label}:</Text>
                    <div style={{ marginTop: 4 }}>
                      {group.formats.map((fmt) => (
                        <Tooltip key={fmt.code} title={fmt.desc}>
                          <Tag
                            style={{ cursor: 'pointer', marginBottom: 4 }}
                            onClick={() => insertFormatComponent(fmt.code)}
                          >
                            {fmt.code}
                          </Tag>
                        </Tooltip>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          <div style={{ marginTop: 16 }}>
            <Text strong>Preview: </Text>
            <Text code style={{ fontSize: 16 }}>{previewDate()}</Text>
          </div>
        </Space>
      </Card>

      <Card title="Time Offset" size="small" style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Select
            value={offset}
            onChange={setOffset}
            style={{ width: '100%' }}
          >
            {COMMON_DATE_OFFSETS.map((off) => (
              <Option key={off.value} value={off.value}>
                {off.label}
                {off.value !== 0 && (
                  <Text type="secondary" style={{ marginLeft: 8 }}>
                    ({off.value > 0 ? '+' : ''}{off.value / 86400} days)
                  </Text>
                )}
              </Option>
            ))}
            <Option value="custom">Custom Offset</Option>
          </Select>

          {offset === 'custom' && (
            <Row gutter={8}>
              <Col span={12}>
                <InputNumber
                  value={offsetValue}
                  onChange={(value) => handleOffsetChange(value || 0, offsetUnit)}
                  style={{ width: '100%' }}
                  addonBefore={offsetValue >= 0 ? <PlusOutlined /> : <MinusOutlined />}
                />
              </Col>
              <Col span={12}>
                <Select
                  value={offsetUnit}
                  onChange={(unit) => handleOffsetChange(offsetValue, unit)}
                  style={{ width: '100%' }}
                >
                  <Option value="seconds">Seconds</Option>
                  <Option value="minutes">Minutes</Option>
                  <Option value="hours">Hours</Option>
                  <Option value="days">Days</Option>
                </Select>
              </Col>
            </Row>
          )}
        </Space>
      </Card>

      <Card title="Localization (Optional)" size="small">
        <Form.Item
          name="locale"
          label="Locale"
          extra="Leave empty to use system locale"
        >
          <Select
            allowClear
            placeholder="Select locale (e.g., en-US, fr-FR)"
            value={locale}
            onChange={setLocale}
          >
            <Option value="en-US">English (US)</Option>
            <Option value="en-GB">English (UK)</Option>
            <Option value="fr-FR">French (France)</Option>
            <Option value="de-DE">German (Germany)</Option>
            <Option value="es-ES">Spanish (Spain)</Option>
            <Option value="it-IT">Italian (Italy)</Option>
            <Option value="pt-BR">Portuguese (Brazil)</Option>
            <Option value="ja-JP">Japanese (Japan)</Option>
            <Option value="zh-CN">Chinese (China)</Option>
            <Option value="ko-KR">Korean (Korea)</Option>
          </Select>
        </Form.Item>
      </Card>
    </Form>
  );
};
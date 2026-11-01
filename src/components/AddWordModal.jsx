import { useState, useMemo } from 'react';
import {
  Modal,
  Tabs,
  Form,
  Input,
  AutoComplete,
  Button,
  Space,
  Checkbox,
  Upload,
  Table,
  Tag,
  Alert,
  Typography,
  Flex,
  message,
} from 'antd';
import {
  EditOutlined,
  FileTextOutlined,
  TableOutlined,
  InboxOutlined,
  CloudDownloadOutlined,
  PlusOutlined,
  CloseOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import Papa from 'papaparse';
import { useStore } from '../store/useStore';

function generateId() {
  return 'c' + Date.now() + Math.random().toString(36).slice(2, 6);
}

// Parse bulk text format
function parseBulkText(text) {
  if (!text) return [];
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const words = [];
  let currentTopic = 'Từ tự thêm';

  for (const line of lines) {
    if (line.startsWith('###')) {
      currentTopic = line.replace(/^###\s*/, '').trim();
      continue;
    }

    // Try to split on separators: —, –, -, =, :
    const sepMatch = line.match(/^(.+?)\s*[—–\-=:]\s*(.+)$/);
    if (!sepMatch) continue;

    const word = sepMatch[1].trim();
    const rest = sepMatch[2].trim();

    // Split rest by | to get vi | en | example | exampleVi
    const parts = rest.split('|').map(p => p.trim());
    const vi = parts[0] || '';
    const en = parts[1] || '';
    const example = parts[2] || '';
    const exampleVi = parts[3] || '';

    if (word && vi) {
      words.push({ id: generateId(), word, topic: currentTopic, vi, en, example, exampleVi });
    }
  }
  return words;
}

// Convert Google Sheets URL to CSV export URL
function toCsvUrl(url) {
  try {
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    const gidMatch = url.match(/gid=(\d+)/);
    if (!match) return null;
    const sheetId = match[1];
    const gid = gidMatch ? gidMatch[1] : '0';
    return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
  } catch {
    return null;
  }
}

export default function AddWordModal({ onClose }) {
  const addCustomWords = useStore(s => s.addCustomWords);
  const getAllWords = useStore(s => s.getAllWords);
  const sheetsUrl = useStore(s => s.sheetsUrl);
  const setSheetsUrl = useStore(s => s.setSheetsUrl);

  const [activeTab, setActiveTab] = useState('single');
  const [goStudy, setGoStudy] = useState(true);

  // Single form instance
  const [form] = Form.useForm();

  // Bulk text state
  const [bulkText, setBulkText] = useState('');
  const [csvPreview, setCsvPreview] = useState([]);

  // Google Sheets state
  const [sheetInput, setSheetInput] = useState(sheetsUrl || '');
  const [sheetLoading, setSheetLoading] = useState(false);
  const [sheetPreview, setSheetPreview] = useState(null);
  const [sheetError, setSheetError] = useState('');

  // Extract unique topics for autocomplete
  const topicOptions = useMemo(() => {
    const unique = Array.from(new Set(getAllWords().map(w => w.topic).filter(Boolean)));
    return unique.map(t => ({ value: t, label: t }));
  }, [getAllWords]);

  // Single word submit
  const handleSingleFinish = (values) => {
    const newWord = {
      id: generateId(),
      word: values.word.trim(),
      topic: values.topic?.trim() || 'Từ tự thêm',
      vi: values.vi.trim(),
      en: values.en?.trim() || '',
      example: values.example?.trim() || '',
      exampleVi: values.exampleVi?.trim() || '',
      note: values.note?.trim() || '',
    };
    addCustomWords([newWord]);
    message.success(`Đã thêm từ "${newWord.word}" thành công!`);
    onClose(goStudy ? newWord : null);
  };

  // Bulk text submit
  const handleBulkSave = () => {
    const parsedWords = parseBulkText(bulkText);
    if (parsedWords.length === 0) {
      message.error('Không tìm thấy từ hợp lệ nào. Định dạng: Từ — Nghĩa | Definition | Example');
      return;
    }
    addCustomWords(parsedWords);
    message.success(`Đã thêm ${parsedWords.length} từ vào danh sách!`);
    onClose(goStudy ? parsedWords[0] : null);
  };

  // CSV file parser
  const handleCsvFile = (file) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const rows = result.data.map(row => {
          const r = {};
          Object.entries(row).forEach(([k, v]) => {
            r[k.toLowerCase().trim()] = (v || '').toString().trim();
          });
          return r;
        });

        const parsed = rows
          .filter(r => r.word || r['từ'] || r['english'])
          .map(r => ({
            id: generateId(),
            word: (r.word || r['từ'] || r['english'] || '').trim(),
            topic: (r.topic || r['chủ đề'] || r['chu de'] || 'Từ File CSV').trim(),
            vi: (r.vi || r['nghĩa'] || r['vietnamese'] || r['nghia'] || '').trim(),
            en: (r.en || r['definition'] || r['english definition'] || '').trim(),
            example: (r.example || r['câu ví dụ'] || r['sentence'] || '').trim(),
            exampleVi: (r.examplevi || r['example_vi'] || r['dịch ví dụ'] || r['dich vi du'] || r['câu ví dụ tiếng việt'] || '').trim(),
          }))
          .filter(r => r.word && r.vi);

        if (parsed.length === 0) {
          message.error('Không tìm thấy từ hợp lệ trong file CSV. File cần có cột word, vi.');
          return;
        }

        setCsvPreview(parsed);
        message.success(`Đã đọc được ${parsed.length} từ từ file CSV!`);
      },
      error: (err) => {
        message.error(`Lỗi đọc file CSV: ${err.message}`);
      },
    });
    return false; // Prevent automatic HTTP upload
  };

  const handleCsvSave = () => {
    if (!csvPreview.length) return;
    addCustomWords(csvPreview);
    message.success(`Đã thêm ${csvPreview.length} từ từ CSV!`);
    onClose(goStudy ? csvPreview[0] : null);
  };

  // Google Sheets load
  const loadFromSheets = async () => {
    const csvUrl = toCsvUrl(sheetInput);
    if (!csvUrl) {
      setSheetError('URL không hợp lệ. Cần link Google Sheets dạng /spreadsheets/d/...');
      return;
    }
    setSheetLoading(true);
    setSheetError('');
    try {
      const resp = await fetch(csvUrl);
      if (!resp.ok) {
        throw new Error('Không thể tải Sheet. Đảm bảo Sheet đã được "Share → Anyone with link can view".');
      }
      const text = await resp.text();
      const result = Papa.parse(text, { header: true, skipEmptyLines: true });
      const rows = result.data.map(row => {
        const r = {};
        Object.entries(row).forEach(([k, v]) => {
          r[k.toLowerCase().trim()] = (v || '').toString().trim();
        });
        return r;
      });

      const parsed = rows
        .filter(r => r.word || r['từ'] || r['english'])
        .map(r => ({
          id: generateId(),
          word: (r.word || r['từ'] || r['english'] || '').trim(),
          topic: (r.topic || r['chủ đề'] || r['chu de'] || 'Từ Google Sheets').trim(),
          vi: (r.vi || r['nghĩa'] || r['vietnamese'] || r['nghia'] || '').trim(),
          en: (r.en || r['definition'] || r['english definition'] || '').trim(),
          example: (r.example || r['câu ví dụ'] || r['sentence'] || '').trim(),
          exampleVi: (r.examplevi || r['example_vi'] || r['dịch ví dụ'] || r['dich vi du'] || r['câu ví dụ tiếng việt'] || '').trim(),
        }))
        .filter(r => r.word && r.vi);

      if (parsed.length === 0) {
        setSheetError('Không tìm thấy dòng từ vựng hợp lệ nào trong bảng tính (cần cột word, vi).');
      } else {
        setSheetPreview(parsed);
        setSheetsUrl(sheetInput);
        message.success(`Tìm thấy ${parsed.length} từ vựng từ Google Sheets!`);
      }
    } catch (err) {
      setSheetError(err.message);
    } finally {
      setSheetLoading(false);
    }
  };

  const handleSheetsSave = () => {
    if (!sheetPreview?.length) return;
    addCustomWords(sheetPreview);
    message.success(`Đã thêm ${sheetPreview.length} từ từ Google Sheets!`);
    onClose(goStudy ? sheetPreview[0] : null);
  };

  const previewColumns = [
    {
      title: 'Từ vựng',
      dataIndex: 'word',
      key: 'word',
      render: (text) => <Typography.Text strong>{text}</Typography.Text>,
    },
    {
      title: 'Nghĩa tiếng Việt',
      dataIndex: 'vi',
      key: 'vi',
    },
    {
      title: 'Chủ đề',
      dataIndex: 'topic',
      key: 'topic',
      render: (topic) => <Tag color="blue">{topic}</Tag>,
    },
  ];

  const parsedBulkCount = useMemo(() => parseBulkText(bulkText).length, [bulkText]);

  const tabItems = [
    {
      key: 'single',
      label: (
        <Space>
          <EditOutlined />
          <span>Thêm từng từ</span>
        </Space>
      ),
      children: (
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSingleFinish}
          requiredMark="optional"
          style={{ marginTop: 12 }}
        >
          <Form.Item
            name="word"
            label="Từ tiếng Anh"
            rules={[{ required: true, message: 'Vui lòng nhập từ tiếng Anh!' }]}
          >
            <Input placeholder="e.g. critical thinking" autoFocus />
          </Form.Item>

          <Form.Item name="topic" label="Chủ đề (Topic)">
            <AutoComplete
              options={topicOptions}
              placeholder="Chọn hoặc nhập tên chủ đề mới..."
              filterOption={(inputValue, option) =>
                (option?.value ?? '').toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
              }
            />
          </Form.Item>

          <Form.Item
            name="vi"
            label="Nghĩa tiếng Việt"
            rules={[{ required: true, message: 'Vui lòng nhập nghĩa tiếng Việt!' }]}
          >
            <Input placeholder="e.g. tư duy phản biện" />
          </Form.Item>

          <Form.Item name="en" label="Nghĩa tiếng Anh (Definition)">
            <Input.TextArea
              rows={2}
              placeholder="e.g. the objective analysis and evaluation of an issue..."
            />
          </Form.Item>

          <Form.Item name="example" label="Câu ví dụ tiếng Anh">
            <Input.TextArea
              rows={2}
              placeholder="e.g. She uses critical thinking to solve complex problems."
            />
          </Form.Item>

          <Form.Item name="exampleVi" label="Dịch câu ví dụ">
            <Input.TextArea
              rows={2}
              placeholder="e.g. Cô ấy áp dụng tư duy phản biện để giải quyết các vấn đề phức tạp."
            />
          </Form.Item>

          <Form.Item name="note" label="Ghi chú cá nhân (tùy chọn)">
            <Input placeholder="Ghi chú bổ sung..." />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, marginTop: 16 }}>
            <Flex justify="space-between" align="center" wrap="wrap" gap={12}>
              <Checkbox checked={goStudy} onChange={e => setGoStudy(e.target.checked)}>
                Chuyển đến học từ này ngay lập tức
              </Checkbox>
              <Space>
                <Button onClick={() => onClose(null)} icon={<CloseOutlined />}>
                  Hủy
                </Button>
                <Button type="primary" htmlType="submit" icon={<PlusOutlined />}>
                  Lưu từ vựng
                </Button>
              </Space>
            </Flex>
          </Form.Item>
        </Form>
      ),
    },
    {
      key: 'bulk',
      label: (
        <Space>
          <FileTextOutlined />
          <span>Nhập hàng loạt / CSV</span>
        </Space>
      ),
      children: (
        <Space orientation="vertical" size={16} style={{ width: '100%', marginTop: 12 }}>
          {/* File CSV upload */}
          <Upload.Dragger
            accept=".csv,.txt"
            beforeUpload={handleCsvFile}
            showUploadList={false}
            style={{ padding: '16px 0', background: 'rgba(255, 255, 255, 0.02)' }}
          >
            <p className="ant-upload-drag-icon" style={{ marginBottom: 8 }}>
              <InboxOutlined style={{ fontSize: 36, color: '#7c6af7' }} />
            </p>
            <Typography.Text strong style={{ fontSize: 14 }}>
              Kéo thả hoặc bấm để chọn file CSV từ máy tính
            </Typography.Text>
            <div>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                Hỗ trợ file CSV chứa các cột: word, vi, topic, en, example, exampleVi
              </Typography.Text>
            </div>
          </Upload.Dragger>

          {csvPreview.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <Alert
                type="success"
                showIcon
                title={`Đã đọc thành công ${csvPreview.length} từ từ file CSV`}
                style={{ marginBottom: 10 }}
              />
              <Table
                dataSource={csvPreview.slice(0, 5)}
                columns={previewColumns}
                rowKey="id"
                pagination={false}
                size="small"
              />
              {csvPreview.length > 5 && (
                <Typography.Text type="secondary" style={{ fontSize: 12, marginTop: 6, display: 'block' }}>
                  ...và còn {csvPreview.length - 5} từ nữa
                </Typography.Text>
              )}
              <Flex justify="space-between" align="center" style={{ marginTop: 12 }}>
                <Checkbox checked={goStudy} onChange={e => setGoStudy(e.target.checked)}>
                  Chuyển đến học từ đầu tiên ngay lập tức
                </Checkbox>
                <Button type="primary" icon={<CheckCircleOutlined />} onClick={handleCsvSave}>
                  Lưu {csvPreview.length} từ từ CSV
                </Button>
              </Flex>
            </div>
          )}

          {/* Paste bulk text */}
          <div style={{ marginTop: 8 }}>
            <Alert
              type="info"
              showIcon
              title="Hoặc dán danh sách từ theo cú pháp văn bản:"
              description={
                <div style={{ fontSize: 12, marginTop: 4 }}>
                  <div><code>### Tên chủ đề</code> (để đặt nhóm chủ đề cho các từ bên dưới)</div>
                  <div><code>Từ tiếng Anh — Nghĩa Việt | Định nghĩa | Câu ví dụ | Dịch ví dụ</code></div>
                  <div style={{ color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>
                    Dấu phân cách: <code>— – - = :</code> | Dấu <code>|</code> để phân tách definition & example
                  </div>
                </div>
              }
              style={{ marginBottom: 12 }}
            />

            <Input.TextArea
              rows={6}
              value={bulkText}
              onChange={e => setBulkText(e.target.value)}
              placeholder={`### Technology\ncritical thinking — tư duy phản biện | the ability to analyze | She uses critical thinking daily. | Cô ấy dùng tư duy phản biện hàng ngày.\nremote working — làm việc từ xa | working from home`}
            />

            <Flex justify="space-between" align="center" style={{ marginTop: 12 }} wrap="wrap" gap={8}>
              <Typography.Text type="secondary">
                {parsedBulkCount > 0
                  ? `Sẽ thêm ~${parsedBulkCount} từ vựng hợp lệ`
                  : 'Chưa có từ nào được nhận diện'}
              </Typography.Text>
              <Space>
                <Checkbox checked={goStudy} onChange={e => setGoStudy(e.target.checked)}>
                  Học ngay
                </Checkbox>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  disabled={parsedBulkCount === 0}
                  onClick={handleBulkSave}
                >
                  Lưu {parsedBulkCount > 0 ? `~${parsedBulkCount} từ` : 'hàng loạt'}
                </Button>
              </Space>
            </Flex>
          </div>
        </Space>
      ),
    },
    {
      key: 'sheets',
      label: (
        <Space>
          <TableOutlined />
          <span>Google Sheets</span>
        </Space>
      ),
      children: (
        <Space orientation="vertical" size={14} style={{ width: '100%', marginTop: 12 }}>
          <Alert
            type="info"
            showIcon
            title="Nhập link Google Sheets công khai"
            description={
              <span style={{ fontSize: 12 }}>
                Đảm bảo bảng tính đã bật chia sẻ: <strong>"Bất kỳ ai có đường liên kết đều có thể xem"</strong> (Anyone with link can view). Cột yêu cầu: <code>word</code>, <code>vi</code> (tùy chọn: <code>topic</code>, <code>en</code>, <code>example</code>, <code>exampleVi</code>).
              </span>
            }
          />

          <Flex gap={8}>
            <Input
              placeholder="https://docs.google.com/spreadsheets/d/..."
              value={sheetInput}
              onChange={e => setSheetInput(e.target.value)}
              style={{ flex: 1 }}
            />
            <Button
              type="primary"
              icon={<CloudDownloadOutlined />}
              onClick={loadFromSheets}
              loading={sheetLoading}
            >
              Tải Sheet
            </Button>
          </Flex>

          {sheetError && (
            <Alert type="error" showIcon title={sheetError} />
          )}

          {sheetPreview && (
            <div>
              <Alert
                type="success"
                showIcon
                title={`Tìm thấy ${sheetPreview.length} từ vựng hợp lệ trong Google Sheet:`}
                style={{ marginBottom: 10 }}
              />
              <Table
                dataSource={sheetPreview.slice(0, 5)}
                columns={previewColumns}
                rowKey="id"
                pagination={false}
                size="small"
              />
              {sheetPreview.length > 5 && (
                <Typography.Text type="secondary" style={{ fontSize: 12, marginTop: 6, display: 'block' }}>
                  ...và còn {sheetPreview.length - 5} từ nữa trong bảng tính
                </Typography.Text>
              )}
              <Flex justify="space-between" align="center" style={{ marginTop: 14 }}>
                <Checkbox checked={goStudy} onChange={e => setGoStudy(e.target.checked)}>
                  Chuyển đến học từ đầu tiên ngay lập tức
                </Checkbox>
                <Button
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  onClick={handleSheetsSave}
                >
                  Lưu {sheetPreview.length} từ vào danh sách
                </Button>
              </Flex>
            </div>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Modal
      open={true}
      onCancel={() => onClose(null)}
      footer={null}
      width={720}
      title={
        <Typography.Title level={4} style={{ margin: 0 }}>
          ➕ Thêm từ mới vào VocabMaster
        </Typography.Title>
      }
    >
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
      />
    </Modal>
  );
}

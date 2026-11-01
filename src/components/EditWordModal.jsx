import { useEffect, useMemo } from 'react';
import { Modal, Form, Input, AutoComplete, Button, Space, Typography, message } from 'antd';
import { SaveOutlined, CloseOutlined } from '@ant-design/icons';
import { useStore } from '../store/useStore';

export default function EditWordModal({ word, isOpen, onClose, onSaved }) {
  const [form] = Form.useForm();
  const updateWord = useStore(s => s.updateWord);
  const getAllWords = useStore(s => s.getAllWords);

  // Extract unique topics for autocomplete suggestions
  const topicOptions = useMemo(() => {
    const existingTopics = Array.from(new Set(getAllWords().map(w => w.topic).filter(Boolean)));
    return existingTopics.map(t => ({ value: t, label: t }));
  }, [getAllWords]);

  useEffect(() => {
    if (word && isOpen) {
      form.setFieldsValue({
        word: word.word || '',
        topic: word.topic || '',
        vi: word.vi || '',
        en: word.en || '',
        example: word.example || '',
        exampleVi: word.exampleVi || '',
      });
    }
  }, [word, isOpen, form]);

  const handleFinish = (values) => {
    if (!word) return;
    const updatedFields = {
      word: values.word.trim(),
      topic: values.topic?.trim() || 'Chung',
      vi: values.vi.trim(),
      en: values.en?.trim() || '',
      example: values.example?.trim() || '',
      exampleVi: values.exampleVi?.trim() || '',
    };

    updateWord(word.id, updatedFields);
    onSaved?.(updatedFields);
    message.success(`Đã cập nhật từ "${updatedFields.word}"!`);
    onClose();
  };

  return (
    <Modal
      open={isOpen}
      onCancel={onClose}
      footer={null}
      destroyOnHidden
      width={600}
      title={
        <Typography.Title level={4} style={{ margin: 0 }}>
          ✏️ Chỉnh sửa từ vựng
        </Typography.Title>
      }
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        requiredMark="optional"
        style={{ marginTop: 16 }}
      >
        <Form.Item
          name="word"
          label="Từ vựng / Collocation tiếng Anh"
          rules={[{ required: true, message: 'Vui lòng nhập từ tiếng Anh!' }]}
        >
          <Input placeholder="e.g. acquire a language" autoFocus />
        </Form.Item>

        <Form.Item
          name="topic"
          label="Chủ đề (Topic)"
        >
          <AutoComplete
            options={topicOptions}
            placeholder="Chọn hoặc nhập chủ đề mới..."
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
          <Input placeholder="e.g. tiếp thu / học một ngôn ngữ" />
        </Form.Item>

        <Form.Item
          name="en"
          label="Định nghĩa tiếng Anh (English Definition)"
        >
          <Input.TextArea
            rows={2}
            placeholder="e.g. to learn a language naturally through exposure"
          />
        </Form.Item>

        <Form.Item
          name="example"
          label="Câu ví dụ tiếng Anh (Example sentence)"
        >
          <Input.TextArea
            rows={2}
            placeholder="e.g. Children can acquire a second language with remarkable speed."
          />
        </Form.Item>

        <Form.Item
          name="exampleVi"
          label="Dịch nghĩa câu ví dụ (Example translation)"
        >
          <Input.TextArea
            rows={2}
            placeholder="e.g. Trẻ em có thể tiếp thu ngôn ngữ thứ hai với tốc độ đáng kinh ngạc."
          />
        </Form.Item>

        <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
          <Space style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
            <Button onClick={onClose} icon={<CloseOutlined />}>
              Hủy
            </Button>
            <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>
              Lưu thay đổi
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
}

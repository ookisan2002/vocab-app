/**
 * Service handling Google Gemini API integration for IELTS AI Tutor
 */
import { PROJECT_KNOWLEDGE } from '../data/projectKnowledge';

export const GEMINI_STORAGE_KEY = 'vocab_gemini_api_key';

/**
 * Get stored Gemini API key from localStorage
 */
export function getStoredApiKey() {
  try {
    return localStorage.getItem(GEMINI_STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

/**
 * Save Gemini API key to localStorage
 */
export function saveApiKey(apiKey) {
  try {
    if (apiKey) {
      localStorage.setItem(GEMINI_STORAGE_KEY, apiKey.trim());
    } else {
      localStorage.removeItem(GEMINI_STORAGE_KEY);
    }
  } catch (e) {
    console.error('Failed to save API key to localStorage:', e);
  }
}

/**
 * Remove stored API key
 */
export function removeApiKey() {
  try {
    localStorage.removeItem(GEMINI_STORAGE_KEY);
  } catch (e) {
    console.error('Failed to remove API key:', e);
  }
}

/**
 * Test the Gemini API key with a minimal prompt
 * Endpoint: gemini-1.5-flash
 */
export async function testApiKey(apiKey) {
  if (!apiKey || !apiKey.trim()) {
    throw new Error('Vui lòng nhập API Key.');
  }

  const cleanKey = apiKey.trim();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(cleanKey)}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: 'Hello' }],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const rawMsg = errorData?.error?.message || response.statusText;

      if (response.status === 400 || rawMsg.toLowerCase().includes('api key') || rawMsg.toLowerCase().includes('not valid')) {
        throw new Error('API Key không hợp lệ. Vui lòng kiểm tra lại key bạn lấy từ Google AI Studio.');
      }
      if (response.status === 429 || rawMsg.toLowerCase().includes('quota') || rawMsg.toLowerCase().includes('resource_exhausted')) {
        throw new Error('API Key đã hết hạn mức (Quota exceeded) hoặc gửi yêu cầu quá nhanh. Vui lòng thử lại sau.');
      }
      if (response.status === 403) {
        throw new Error('Không có quyền truy cập Gemini API (403 Forbidden). Hãy chắc chắn bạn đã kích hoạt API trên Google AI Studio.');
      }

      throw new Error(`Kết nối thất bại (${response.status}): ${rawMsg}`);
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Không thể kết nối đến Google Gemini. Vui lòng kiểm tra lại đường truyền mạng internet.');
    }
    throw error;
  }
}

/**
 * Send chat conversation to Gemini API with IELTS tutor system prompt and current word context
 */
export async function sendChatMessage(apiKey, messages, currentWord) {
  if (!apiKey || !apiKey.trim()) {
    throw new Error('Chưa cấu hình API Key. Vui lòng cài đặt API Key.');
  }

  const cleanKey = apiKey.trim();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(cleanKey)}`;

  // Extract current word info
  const wordText = typeof currentWord === 'string' ? currentWord : currentWord?.word;
  const wordVi = typeof currentWord === 'object' ? currentWord?.vi : '';
  const wordTopic = typeof currentWord === 'object' ? currentWord?.topic : '';
  const wordExample = typeof currentWord === 'object' ? currentWord?.example : '';

  let wordContext = '';
  if (wordText) {
    wordContext = `\n\n[TỪ VỰNG HỌC VIÊN ĐANG XEM TRÊN MÀN HÌNH]:
- Từ / cụm từ: "${wordText}"
${wordVi ? `- Nghĩa tiếng Việt: "${wordVi}"\n` : ''}${wordTopic ? `- Chủ đề: "${wordTopic}"\n` : ''}${wordExample ? `- Ví dụ mẫu: "${wordExample}"\n` : ''}
*LƯU Ý: Khi người học hỏi liên quan đến từ đang học hoặc bấm các nút hỏi nhanh, hãy ưu tiên tập trung phân tích từ vựng này thật sâu sắc và chuẩn IELTS.*`;
  }

  const systemInstructionText = `Bạn là "IELTS AI Tutor" - một chuyên gia khảo thí & gia sư luyện thi IELTS hàng đầu (Band 8.5+), thông minh, tận tâm và thân thiện, đồng thời là Trợ lý AI tích hợp sẵn của ứng dụng VocabMaster.

MỤC TIÊU & PHONG CÁCH GIẢNG DẠY:
1. Giải thích từ vựng tiếng Anh học thuật một cách rõ ràng, sinh động bằng tiếng Việt kết hợp các ví dụ tiếng Anh tự nhiên.
2. Tiêu chuẩn IELTS Band 7.0+: Luôn cung cấp collocations tự nhiên, từ đồng nghĩa/trái nghĩa, và ví dụ câu chuẩn ngữ cảnh thi cử.
3. Ứng dụng thực chiến: Chỉ dẫn cách dùng từ trong IELTS Writing (Task 1, Task 2) và IELTS Speaking (Part 1, 2, 3).
4. Phản hồi có cấu trúc khoa học: Sử dụng Markdown (in đậm từ vựng quan trọng, danh sách gạch đầu dòng, ví dụ trích dẫn, khối mã code block).
5. Trả lời súc tích, vừa vặn trên giao diện học tập nhỏ gọn, không viết quá lan man dài dòng trừ khi được yêu cầu chi tiết.

${PROJECT_KNOWLEDGE}${wordContext}`;

  // Format messages for Gemini API
  // Gemini requires:
  // - roles: 'user' or 'model'
  // - alternating user and model turns
  // - first turn must be 'user'
  const formattedContents = [];

  for (const msg of messages) {
    const role = msg.role === 'assistant' || msg.role === 'model' ? 'model' : 'user';
    const text = (msg.content || msg.text || '').trim();
    if (!text) continue;

    if (formattedContents.length > 0 && formattedContents[formattedContents.length - 1].role === role) {
      formattedContents[formattedContents.length - 1].parts[0].text += `\n\n${text}`;
    } else {
      formattedContents.push({
        role,
        parts: [{ text }],
      });
    }
  }

  // Ensure first turn is 'user'
  while (formattedContents.length > 0 && formattedContents[0].role === 'model') {
    formattedContents.shift();
  }

  if (formattedContents.length === 0) {
    throw new Error('Nội dung tin nhắn trống.');
  }

  const payload = {
    systemInstruction: {
      parts: [{ text: systemInstructionText }],
    },
    contents: formattedContents,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1200,
    },
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const rawMsg = errorData?.error?.message || response.statusText;

      if (response.status === 429 || rawMsg.toLowerCase().includes('quota') || rawMsg.toLowerCase().includes('resource_exhausted')) {
        throw new Error('Bạn đã gửi yêu cầu quá nhanh hoặc hết quota miễn phí của Gemini API. Vui lòng chờ 1 phút rồi thử lại.');
      }
      if (response.status === 400 && rawMsg.toLowerCase().includes('api key')) {
        throw new Error('API Key không hợp lệ hoặc đã bị vô hiệu hóa. Vui lòng kiểm tra lại trong phần Cài đặt API Key.');
      }

      throw new Error(rawMsg || `Lỗi từ Gemini API (mã ${response.status})`);
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    const replyText = candidate?.content?.parts?.map(p => p.text).join('') || '';

    if (!replyText) {
      if (candidate?.finishReason && candidate.finishReason !== 'STOP') {
        throw new Error(`Phản hồi bị ngắt quãng do lý do: ${candidate.finishReason}`);
      }
      throw new Error('Không nhận được câu trả lời từ AI. Vui lòng thử lại.');
    }

    return replyText;
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Không thể kết nối internet. Vui lòng kiểm tra lại mạng.');
    }
    throw error;
  }
}

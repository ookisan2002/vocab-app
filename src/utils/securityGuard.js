/**
 * Security Guardrail System for IELTS AI Tutor
 * Multi-layer protection against unauthorized data extraction,
 * API key leaking, prompt injection, and credential probing.
 */

export const SECURITY_BLOCKED_MESSAGE =
  '🛡️ Vì lý do an toàn và bảo mật, AI Tutor không thể tiết lộ hoặc thảo luận về các thông tin nhạy cảm như API Key, Token, mật khẩu hay biến môi trường hệ thống. Tôi luôn sẵn sàng hỗ trợ bạn học từ vựng và luyện thi IELTS!';

export const REDACTED_TEXT = '[THÔNG TIN BẢO MẬT ĐÃ ĐƯỢC ẨN]';

/**
 * Remove Vietnamese diacritics / accents for robust keyword matching
 */
export function removeVietnameseAccents(str) {
  if (typeof str !== 'string') return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

/**
 * Regex patterns identifying sensitive probing attempts
 */
const SENSITIVE_PATTERNS = [
  // API keys & variants
  /\bapi[_\s-]?keys?\b/i,
  /\b(?:gemini|google|firebase)[_\s-]?(?:api[_\s-]?)?keys?\b/i,
  /\b(?:openai|claude|deepseek)[_\s-]?(?:api[_\s-]?)?keys?\b/i,
  /\bprivate[_\s-]?keys?\b/i,
  /\bsecret[_\s-]?keys?\b/i,
  /\bclient[_\s-]?secrets?\b/i,
  /\bapp[_\s-]?secrets?\b/i,

  // Tokens & authentication credentials
  /\b(?:auth|access|refresh|bearer|id|oauth)[_\s-]?tokens?\b/i,
  /\bbearer\b/i,
  /\bauth[_\s-]?domains?\b/i,
  /\bcredentials?\b/i,

  // Passwords
  /\bpasswords?\b/i,
  /\bpasswds?\b/i,
  /\bpasscodes?\b/i,
  /\bmat[_\s-]?khau\b/i, // matched against accent-removed text

  // Environment variables & system dumps
  /\bdump[_\s-]?envs?\b/i,
  /\b(?:show|get|print|dump|reveal|expose)[_\s-]?(?:all[_\s-]?)?(?:env|environment|vars?)\b/i,
  /\benv(?:ironment)?[_\s-]?vars?(?:iables?)?\b/i,
  /\bbien[_\s-]?moi[_\s-]?truong\b/i, // matched against accent-removed text
  /\bprocess\.env\b/i,
  /\bimport\.meta\.env\b/i,
  /\.env(?:\.local)?\b/i,

  // System prompt / hidden instruction probing & jailbreaks
  /\bsystem[_\s-]?prompts?\b/i,
  /\bsystem[_\s-]?instructions?\b/i,
  /\bdeveloper[_\s-]?prompts?\b/i,
  /\bchi[_\s-]?thi[_\s-]?he[_\s-]?thong\b/i, // matched against accent-removed text
  /\bchi[_\s-]?thi[_\s-]?an\b/i,             // matched against accent-removed text
  /\bprompt[_\s-]?goc\b/i,                  // matched against accent-removed text
  /\bin[_\s-]?ra[_\s-]?(?:prompt|chi[_\s-]?thi)\b/i,
  /\b(?:show|reveal|display|print|repeat)[_\s-]?(?:your|the)?\s*(?:system|hidden)?[_\s-]?(?:prompt|instruction)\b/i,
  /\bjailbreak\b/i,
  /\bignore[_\s-]?previous[_\s-]?instructions\b/i,

  // Secrets probing
  /\bsecrets?\b/i,
  /\btokens?\b/i,
];

/**
 * Check if user input contains sensitive probing queries
 * @param {string} text
 * @returns {{ isBlocked: boolean, reason: string }}
 */
export function containsSensitiveQuery(text) {
  if (!text || typeof text !== 'string') {
    return { isBlocked: false, reason: '' };
  }

  const raw = text.trim();
  const normalized = removeVietnameseAccents(raw).toLowerCase();

  for (const pattern of SENSITIVE_PATTERNS) {
    if (pattern.test(raw) || pattern.test(normalized)) {
      return {
        isBlocked: true,
        reason: `Phát hiện yêu cầu chứa từ khóa nhạy cảm / truy vấn bảo mật: ${pattern.source}`,
      };
    }
  }

  return { isBlocked: false, reason: '' };
}

/**
 * Patterns of sensitive credentials for output sanitization
 */
const OUTPUT_SENSITIVE_PATTERNS = [
  // Google API keys (AIza + 35 characters)
  /AIza[0-9A-Za-z-_]{35}/g,
  // GitHub tokens (ghp_, gho_, ghu_, ghs_, ghr_ + 36 characters)
  /gh[pousr]_[0-9A-Za-z]{36}/g,
  // JWT tokens (starts with ey... dot ...)
  /ey[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+(?:\.[A-Za-z0-9-_=]+)?/g,
  // Private keys (RSA, EC, etc.)
  /-----BEGIN (?:[A-Z0-9_\-\s]+)?PRIVATE KEY-----[\s\S]*?-----END (?:[A-Z0-9_\-\s]+)?PRIVATE KEY-----/g,
];

/**
 * Scan and redact any sensitive keys or tokens from AI output
 * @param {string} text
 * @param {string} [currentApiKey]
 * @returns {string} Cleaned output
 */
export function sanitizeAiOutput(text, currentApiKey) {
  if (typeof text !== 'string') {
    return text || '';
  }

  let sanitized = text;

  // Redact current user's API key if provided
  if (typeof currentApiKey === 'string' && currentApiKey.trim().length >= 6) {
    const trimmed = currentApiKey.trim();
    const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    sanitized = sanitized.replace(new RegExp(escaped, 'g'), REDACTED_TEXT);
  }

  // Redact known token / key patterns
  for (const pattern of OUTPUT_SENSITIVE_PATTERNS) {
    sanitized = sanitized.replace(pattern, REDACTED_TEXT);
  }

  return sanitized;
}

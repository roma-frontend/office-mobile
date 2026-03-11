// Утилиты валидации и безопасности

/**
 * Валидация email
 */
export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Валидация телефона (международный формат)
 */
export function validatePhone(phone: string): boolean {
  return /^\+?[\d\s-()]{10,}$/.test(phone);
}

/**
 * Санитизация ввода - защита от XSS
 */
export function sanitizeInput(input: string): string {
  if (!input) return '';
  return input
    .replace(/[<>]/g, '') // Удаляем HTML теги
    .replace(/javascript:/gi, '') // Удаляем javascript: протокол
    .replace(/on\w+=/gi, '') // Удаляем on* обработчики
    .trim();
}

/**
 * Экранирование HTML для безопасного отображения
 */
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Валидация URL
 */
export function validateUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Ограничение длины строки
 */
export function truncateString(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + '…';
}

/**
 * Валидация имени (только буквы, пробелы, дефисы)
 */
export function validateName(name: string): boolean {
  return /^[\p{L}\p{M}\s'-]+$/u.test(name) && name.trim().length >= 2;
}

/**
 * Генерация безопасного ID
 */
export function generateSafeId(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

/**
 * Проверка на SQL инъекции (базовая)
 */
export function checkSqlInjection(input: string): boolean {
  const suspicious = ['DROP', 'DELETE', 'INSERT', 'UPDATE', '--', ';', 'UNION', 'SELECT'];
  const upperInput = input.toUpperCase();
  return !suspicious.some(keyword => upperInput.includes(keyword));
}

/**
 * Безопасная вставка в сообщение
 */
export function sanitizeMessage(content: string): string {
  return sanitizeInput(truncateString(content, 4000));
}

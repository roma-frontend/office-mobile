import { getInitials as helpersGetInitials } from '../utils/helpers';
import { 
  validateEmail, 
  validatePhone, 
  sanitizeInput, 
  truncateString,
  getInitials,
  formatFileSize 
} from '../utils/validation';

describe('Validation Utils', () => {
  describe('validateEmail', () => {
    it('should return true for valid emails', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name@domain.co.uk')).toBe(true);
    });

    it('should return false for invalid emails', () => {
      expect(validateEmail('invalid')).toBe(false);
      expect(validateEmail('test@')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
    });
  });

  describe('validatePhone', () => {
    it('should return true for valid phone numbers', () => {
      expect(validatePhone('+1234567890')).toBe(true);
      expect(validatePhone('123-456-7890')).toBe(true);
      expect(validatePhone('+374 10 123456')).toBe(true);
    });

    it('should return false for invalid phone numbers', () => {
      expect(validatePhone('123')).toBe(false);
      expect(validatePhone('abc-def-ghij')).toBe(false);
    });
  });

  describe('sanitizeInput', () => {
    it('should remove HTML tags', () => {
      expect(sanitizeInput('<script>alert("xss")</script>')).toBe('alert("xss")');
      expect(sanitizeInput('<b>bold</b>')).toBe('bold');
    });

    it('should remove javascript: protocol', () => {
      expect(sanitizeInput('javascript:alert(1)')).toBe('alert(1)');
    });

    it('should trim whitespace', () => {
      expect(sanitizeInput('  test  ')).toBe('test');
    });
  });

  describe('truncateString', () => {
    it('should truncate long strings', () => {
      expect(truncateString('a'.repeat(100), 10)).toBe('a'.repeat(10) + '…');
    });

    it('should not truncate short strings', () => {
      expect(truncateString('short', 10)).toBe('short');
    });
  });

  describe('getInitials', () => {
    it('should return first two letters capitalized', () => {
      expect(getInitials('John Doe')).toBe('JD');
      expect(getInitials('mary jane')).toBe('MJ');
    });

    it('should handle single names', () => {
      expect(getInitials('Madonna')).toBe('M');
    });
  });
});

import { localDateInputValue } from './formatters';

describe('localDateInputValue', () => {
  it('deve preservar o dia local no campo de data', () => {
    expect(localDateInputValue(new Date(2026, 9, 27, 1, 30))).toBe('2026-10-27');
  });
});

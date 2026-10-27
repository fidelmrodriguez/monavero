import { formatCurrency, formatDate } from '@angular/common';

describe('Localização pt-BR', () => {
  it('deve formatar valores financeiros em reais', () => {
    const valor = formatCurrency(1234.5, 'pt-BR', 'R$', 'BRL');
    expect(valor).toContain('1.234,50');
  });

  it('deve formatar o dia da semana em português', () => {
    const data = formatDate('2026-10-27T12:00:00', 'EEEE', 'pt-BR');
    expect(data).toBe('terça-feira');
  });
});

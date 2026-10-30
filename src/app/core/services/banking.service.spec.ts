import { BankingService } from './banking.service';

describe('Compatibilidade do serviço bancário legado', () => {
  it('usa a implementação mantida na aplicação frontend', () => {
    expect(BankingService).toBeDefined();
  });
});

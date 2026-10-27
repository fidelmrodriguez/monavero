import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { BankingService } from './banking.service';

const usersMock = {
  users: [
    { id: 1, firstName: 'Emily', lastName: 'Johnson', bank: { cardNumber: '4111111111111111', cardType: 'Visa' } },
    { id: 2, firstName: 'Michael', lastName: 'Williams', bank: { cardNumber: '5555555555554444', cardType: 'Mastercard' } },
    { id: 3, firstName: 'Sophia', lastName: 'Brown', bank: { cardNumber: '4012888888881881', cardType: 'Elo' } }
  ]
};

const productsMock = {
  products: [
    { id: 1, title: 'Produto 1', price: 10, category: 'serviços', rating: 4.4 },
    { id: 2, title: 'Produto 2', price: 20, category: 'serviços', rating: 4.2 },
    { id: 3, title: 'Produto 3', price: 30, category: 'cartões', rating: 4.1 },
    { id: 4, title: 'Produto 4', price: 40, category: 'cartões', rating: 4.6 },
    { id: 5, title: 'Produto 5', price: 50, category: 'investimentos', rating: 4.9 },
    { id: 6, title: 'Produto 6', price: 60, category: 'investimentos', rating: 4.0 }
  ]
};

const cartsMock = {
  carts: [
    { id: 1, total: 100, discountedTotal: 90, products: [{ title: 'Compra 1', price: 10, quantity: 2 }] },
    { id: 2, total: 200, discountedTotal: 180, products: [{ title: 'Compra 2', price: 20, quantity: 1 }] }
  ]
};

describe('BankingService', () => {
  let service: BankingService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(BankingService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('deve mapear dados externos para o dashboard bancário', (done) => {
    service.getOverview().subscribe((overview) => {
      expect(overview.accounts.length).toBeGreaterThan(0);
      expect(overview.cards.length).toBe(3);
      expect(overview.transactions.length).toBeGreaterThan(0);
      done();
    });

    httpMock.expectOne('https://dummyjson.com/users?limit=8').flush(usersMock);
    httpMock.expectOne('https://dummyjson.com/products?limit=12').flush(productsMock);
    httpMock.expectOne('https://dummyjson.com/carts?limit=6').flush(cartsMock);
  });
});

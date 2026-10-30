import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { BrlCurrencyDirective, formatBrlCurrency, parseBrlCurrency } from './brl-currency.directive';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, BrlCurrencyDirective],
  template: '<input appBrlCurrency inputmode="decimal" [formControl]="amount" />'
})
class CurrencyHost {
  readonly amount = new FormControl<number | null>(null, [Validators.required, Validators.min(0.01), Validators.max(50000)]);
}

describe('BrlCurrencyDirective', () => {
  let fixture: ComponentFixture<CurrencyHost>;
  let input: HTMLInputElement;
  let host: CurrencyHost;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [CurrencyHost] }).compileComponents();
    fixture = TestBed.createComponent(CurrencyHost);
    fixture.detectChanges();
    host = fixture.componentInstance;
    input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
  });

  function press(key: string): void {
    input.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
    fixture.detectChanges();
  }

  it('formata valores vindos do formulário e preserva o número', () => {
    host.amount.setValue(1234.56);
    fixture.detectChanges();
    expect(input.value).toBe('R$ 1.234,56');
    expect(host.amount.value).toBe(1234.56);
  });

  it('permite digitar reais naturalmente e centavos usando vírgula', () => {
    for (const digit of '1234') press(digit);
    expect(input.value).toBe('R$ 1.234,00');
    expect(host.amount.value).toBe(1234);
    press(',');
    press('5');
    press('6');
    expect(input.value).toBe('R$ 1.234,56');
    expect(host.amount.value).toBe(1234.56);
    expect(host.amount.valid).toBeTrue();
  });

  it('aceita valores em notação brasileira, com ponto de milhar e centavos, colados ou digitados no mobile', () => {
    input.value = 'R$ 12.345,67';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    expect(input.value).toBe('R$ 12.345,67');
    expect(host.amount.value).toBe(12345.67);
  });

  it('não converte R$ 100,00 em R$ 1,00 e não troca vírgula por milhar', () => {
    input.value = '100';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    expect(host.amount.value).toBe(100);
    expect(input.value).toBe('R$ 100,00');
  });

  it('permite limpar completamente o campo e mantém a validação obrigatória', () => {
    host.amount.setValue(100);
    fixture.detectChanges();
    input.select();
    press('Backspace');
    expect(input.value).toBe('');
    expect(host.amount.value).toBeNull();
    expect(host.amount.hasError('required')).toBeTrue();
  });

  it('respeita min/max pelo valor numérico sem mudar a regra bancária', () => {
    host.amount.setValue(50000.01);
    fixture.detectChanges();
    expect(input.value).toBe('R$ 50.000,01');
    expect(host.amount.hasError('max')).toBeTrue();
    host.amount.setValue(0);
    fixture.detectChanges();
    expect(host.amount.hasError('min')).toBeTrue();
  });

  it('marca como tocado quando o campo perde o foco', () => {
    input.dispatchEvent(new Event('blur'));
    expect(host.amount.touched).toBeTrue();
  });

  it('permite alternar entre campo bloqueado e habilitado pelo formulário', () => {
    host.amount.disable();
    fixture.detectChanges();
    expect(input.disabled).toBeTrue();
    host.amount.enable();
    fixture.detectChanges();
    expect(input.disabled).toBeFalse();
  });
});

describe('formatação BRL', () => {
  it('formata as casas decimais corretamente', () => {
    expect(formatBrlCurrency(0.01)).toBe('R$ 0,01');
    expect(formatBrlCurrency(10)).toBe('R$ 10,00');
    expect(formatBrlCurrency(10000.5)).toBe('R$ 10.000,50');
  });

  it('lê valores brasileiros, sem perda de centavos', () => {
    expect(parseBrlCurrency('R$ 1.234,56')).toBe(1234.56);
    expect(parseBrlCurrency('1.234,5')).toBe(1234.50);
    expect(parseBrlCurrency('1234.56')).toBe(1234.56);
    expect(parseBrlCurrency('100')).toBe(100);
    expect(parseBrlCurrency('')).toBeNull();
    expect(parseBrlCurrency('não é dinheiro')).toBeNull();
  });
});

import { Directive, ElementRef, HostListener, forwardRef, inject } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/**
 * Valor exibido sempre em real brasileiro, mas armazenado no FormControl como
 * número decimal (ou null quando vazio). Não envia textos localizados à API.
 */
export function formatBrlCurrency(value: number): string {
  const cents = Math.round(value * 100);
  const integer = Math.floor(cents / 100).toLocaleString('pt-BR');
  return `R$ ${integer},${String(cents % 100).padStart(2, '0')}`;
}

/** Aceita valores colados em notação brasileira e números não formatados. */
export function parseBrlCurrency(text: string): number | null {
  const clean = text.replace(/[^\d,.]/g, '');
  if (!/\d/.test(clean)) return null;

  const commaIndex = clean.lastIndexOf(',');
  const dotIndex = clean.lastIndexOf('.');
  let integerPart = clean;
  let decimalPart = '';

  if (commaIndex >= 0) {
    integerPart = clean.slice(0, commaIndex);
    decimalPart = clean.slice(commaIndex + 1);
  } else if (dotIndex >= 0 && /^\d{1,2}$/.test(clean.slice(dotIndex + 1))) {
    // Também aceita 1234.56 colado de sistemas que usam ponto decimal.
    integerPart = clean.slice(0, dotIndex);
    decimalPart = clean.slice(dotIndex + 1);
  }

  const integerDigits = integerPart.replace(/\D/g, '');
  const fractionDigits = decimalPart.replace(/\D/g, '').slice(0, 2);
  const whole = Number(integerDigits || '0');
  if (!Number.isSafeInteger(whole) || whole > 999_999_999_999) return null;
  const cents = whole * 100 + Number(fractionDigits.padEnd(2, '0'));
  return cents / 100;
}

@Directive({
  selector: 'input[appBrlCurrency]',
  standalone: true,
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => BrlCurrencyDirective), multi: true }]
})
export class BrlCurrencyDirective implements ControlValueAccessor {
  private readonly input = inject<ElementRef<HTMLInputElement>>(ElementRef).nativeElement;
  private onChange: (value: number | null) => void = () => {};
  private onTouched: () => void = () => {};
  private cents: number | null = null;

  writeValue(value: number | string | null | undefined): void {
    if (value === null || value === undefined || value === '') {
      this.cents = null;
    } else {
      const numberValue = typeof value === 'number' ? value : Number(value);
      this.cents = Number.isFinite(numberValue) && numberValue >= 0
        ? Math.round(numberValue * 100) : null;
    }
    this.render();
  }

  registerOnChange(fn: (value: number | null) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(disabled: boolean): void { this.input.disabled = disabled; }

  @HostListener('blur') onBlur(): void { this.onTouched(); }

  @HostListener('focus') onFocus(): void {
    if (this.cents === null) return;
    // Entrada padrão nos reais; vírgula ou clique nos centavos muda o segmento.
    const comma = this.input.value.indexOf(',');
    if (this.input.selectionStart === this.input.value.length) {
      this.input.setSelectionRange(comma, comma);
    }
  }

  @HostListener('keydown', ['$event']) onKeyDown(event: KeyboardEvent): void {
    if (event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return;
    const key = event.key;
    if (!/^[0-9]$/.test(key) && ![',', '.', 'Backspace', 'Delete'].includes(key)) return;
    event.preventDefault();

    const displayed = this.input.value;
    const start = this.input.selectionStart ?? displayed.length;
    const end = this.input.selectionEnd ?? start;
    const allSelected = start === 0 && end === displayed.length && displayed.length > 0;

    if (key === ',' || key === '.') {
      if (this.cents === null) this.update(0);
      const comma = this.input.value.indexOf(',');
      this.input.setSelectionRange(comma + 1, comma + 1);
      return;
    }
    if (allSelected) {
      this.update(/^[0-9]$/.test(key) ? Number(key) * 100 : null);
      this.positionIntegerAtEnd();
      return;
    }
    if (this.cents === null) {
      if (/^[0-9]$/.test(key)) {
        this.update(Number(key) * 100);
        this.positionIntegerAtEnd();
      }
      return;
    }

    const comma = displayed.indexOf(',');
    if (start > comma && end > comma) {
      this.editFraction(key, start, end, comma);
    } else {
      this.editInteger(key, start, end, comma);
    }
  }

  @HostListener('paste', ['$event']) onPaste(event: ClipboardEvent): void {
    const pasted = event.clipboardData?.getData('text') ?? '';
    event.preventDefault();
    const value = parseBrlCurrency(pasted);
    if (value === null) return;
    this.update(Math.round(value * 100));
    this.positionIntegerAtEnd();
  }

  // Fallback para teclados móveis, entrada por voz e preenchimento automático.
  @HostListener('input') onInput(): void {
    const text = this.input.value;
    const caret = this.input.selectionStart ?? text.length;
    const decimalIndex = text.lastIndexOf(',');
    const integerDigitCount = text.slice(0, decimalIndex < 0 ? caret : Math.min(caret, decimalIndex))
      .replace(/\D/g, '').length;
    const inFraction = decimalIndex >= 0 && caret > decimalIndex;
    const value = parseBrlCurrency(text);
    this.update(value === null ? null : Math.round(value * 100));
    if (this.cents === null) return;
    if (inFraction) {
      const comma = this.input.value.indexOf(',');
      const next = Math.min(this.input.value.length, comma + 1 + Math.max(0, caret - decimalIndex - 1));
      this.input.setSelectionRange(next, next);
    } else {
      this.positionInteger(integerDigitCount);
    }
  }

  private editInteger(key: string, start: number, end: number, comma: number): void {
    const displayed = this.input.value;
    const digits = String(Math.floor(this.cents! / 100));
    const prefix = 3; // "R$ "
    const from = displayed.slice(prefix, Math.max(prefix, Math.min(start, comma))).replace(/\D/g, '').length;
    const to = displayed.slice(prefix, Math.max(prefix, Math.min(end, comma))).replace(/\D/g, '').length;
    let next = digits;
    let cursor = from;
    if (/^[0-9]$/.test(key)) {
      next = digits.slice(0, from) + key + digits.slice(to);
      cursor = from + 1;
    } else if (key === 'Backspace') {
      const removeStart = from === to ? Math.max(0, from - 1) : from;
      next = digits.slice(0, removeStart) + digits.slice(to);
      cursor = removeStart;
    } else {
      const removeEnd = from === to ? Math.min(digits.length, to + 1) : to;
      next = digits.slice(0, from) + digits.slice(removeEnd);
    }
    next = (next.replace(/^0+(?=\d)/, '') || '0').slice(0, 12);
    this.update(Number(next) * 100 + this.cents! % 100);
    this.positionInteger(Math.min(cursor, next.length));
  }

  private editFraction(key: string, start: number, end: number, comma: number): void {
    const fractions = String(this.cents! % 100).padStart(2, '0').split('');
    const from = Math.max(0, Math.min(2, start - comma - 1));
    const to = Math.max(0, Math.min(2, end - comma - 1));
    let cursor = from;
    if (/^[0-9]$/.test(key)) {
      fractions[from === 2 ? 1 : from] = key;
      cursor = Math.min(2, from + 1);
    } else if (key === 'Backspace') {
      const index = from === to ? Math.max(0, from - 1) : from;
      for (let i = index; i < Math.min(2, Math.max(index + 1, to)); i++) fractions[i] = '0';
      cursor = index;
    } else {
      for (let i = from; i < Math.min(2, Math.max(from + 1, to)); i++) fractions[i] = '0';
    }
    const next = Math.floor(this.cents! / 100) * 100 + Number(fractions.join(''));
    this.update(next);
    const newComma = this.input.value.indexOf(',');
    this.input.setSelectionRange(newComma + 1 + cursor, newComma + 1 + cursor);
  }

  private update(cents: number | null): void {
    this.cents = cents;
    this.render();
    this.onChange(cents === null ? null : cents / 100);
  }

  private render(): void {
    this.input.value = this.cents === null ? '' : formatBrlCurrency(this.cents / 100);
  }

  private positionIntegerAtEnd(): void {
    const comma = this.input.value.indexOf(',');
    if (comma >= 0) this.input.setSelectionRange(comma, comma);
  }

  private positionInteger(digitsBeforeCaret: number): void {
    const displayed = this.input.value;
    const comma = displayed.indexOf(',');
    if (digitsBeforeCaret === 0) {
      this.input.setSelectionRange(3, 3);
      return;
    }
    let seen = 0;
    for (let i = 3; i < comma; i++) {
      if (/\d/.test(displayed[i])) seen++;
      if (seen >= digitsBeforeCaret) {
        this.input.setSelectionRange(i + 1, i + 1);
        return;
      }
    }
    this.positionIntegerAtEnd();
  }
}

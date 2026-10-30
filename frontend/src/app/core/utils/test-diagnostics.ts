/** Diagnóstico mínimo para avaliação técnica (sem credenciais, PII ou payloads). */
export function testLog(etapa: '4' | '5' | '6', event: string,
  details: Record<string, string | number | boolean> = {}, failed = false): void {
  const message = `[Monavero][Teste E${etapa}] ${event}`;
  if (failed) {
    console.warn(message, details);
  } else {
    console.log(message, details);
  }
}

/** Evita divulgar números de contas em logs e prints do console. */
export function maskedAccount(account: string): string {
  return `••••${account.slice(-4)}`;
}

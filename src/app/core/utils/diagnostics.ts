/** Diagnósticos de operações sem credenciais, dados pessoais ou corpos HTTP. */
export type DiagnosticArea = 'auth' | 'accounts' | 'transfers' | 'scheduling' | 'payments' | 'admin';

export function diagnosticLog(area: DiagnosticArea, event: string,
  details: Record<string, string | number | boolean> = {}, failed = false): void {
  const message = `[Monavero][${area}] ${event}`;
  if (failed) {
    console.warn(message, details);
  } else {
    console.log(message, details);
  }
}

/** Mantém apenas os quatro últimos caracteres da conta nos diagnósticos. */
export function maskedAccount(account: string): string {
  return `••••${account.slice(-4)}`;
}

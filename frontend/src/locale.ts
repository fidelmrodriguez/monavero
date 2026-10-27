import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';

// Compartilhado pela aplicação (browser/SSR) e pelos testes Jasmine/Karma.
registerLocaleData(localePt, 'pt-BR');

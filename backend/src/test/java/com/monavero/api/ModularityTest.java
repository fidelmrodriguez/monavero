package com.monavero.api;

import org.junit.jupiter.api.Test;
import org.springframework.modulith.core.ApplicationModules;

class ModularityTest {

    @Test
    void verificaDependenciasEntreModulos() {
        ApplicationModules.of(MonaveroApiApplication.class).verify();
    }
}

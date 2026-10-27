package com.monavero.api.system;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/system")
@Tag(name = "Sistema", description = "Informações públicas do serviço de demonstração")
public class SystemController {

    @GetMapping("/info")
    @Operation(summary = "Consultar identificação pública da API")
    public SystemInfoResponse info() {
        return new SystemInfoResponse(
            "monavero-api",
            "available",
            "API do ambiente bancário demonstrativo Monavero"
        );
    }
}

package com.monavero.api.accounts;

import com.monavero.api.auth.AuthenticatedUser;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/banking")
public class TransferController {
    private final TransferService service;

    public TransferController(TransferService service) { this.service = service; }

    @PostMapping("/transfers")
    @ResponseStatus(HttpStatus.OK)
    public TransferDtos.Receipt transfer(@AuthenticationPrincipal AuthenticatedUser principal,
                                          @Valid @RequestBody TransferDtos.Request request) {
        return service.execute(principal, request);
    }
}

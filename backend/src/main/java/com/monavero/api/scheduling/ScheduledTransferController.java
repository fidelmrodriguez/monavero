package com.monavero.api.scheduling;

import com.monavero.api.auth.AuthenticatedUser;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/banking/scheduled-transfers")
public class ScheduledTransferController {
    private final ScheduledTransferService service;

    public ScheduledTransferController(ScheduledTransferService service) { this.service = service; }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ScheduledTransferDtos.Item create(@AuthenticationPrincipal AuthenticatedUser user,
                                              @Valid @RequestBody ScheduledTransferDtos.Request request) {
        return service.create(user, request);
    }

    @GetMapping
    public List<ScheduledTransferDtos.Item> list(@AuthenticationPrincipal AuthenticatedUser user) {
        return service.list(user);
    }

    @DeleteMapping("/{id}")
    public ScheduledTransferDtos.Item cancel(@AuthenticationPrincipal AuthenticatedUser user,
                                              @PathVariable UUID id) {
        return service.cancel(user, id);
    }
}

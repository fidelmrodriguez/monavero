package com.monavero.api.admin;

import com.monavero.api.auth.AuthenticatedUser;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
public class AdminController {
    private final AdminService admin;
    public AdminController(AdminService admin) { this.admin = admin; }

    @org.springframework.security.access.prepost.PreAuthorize("authentication.principal.demo() and hasAnyRole('MANAGER', 'ADMIN')")
    @GetMapping("/admin/accounts")
    public List<AdminService.Account> accounts(@RequestParam(defaultValue = "0") int page) {
        return admin.accounts(page);
    }

    @org.springframework.security.access.prepost.PreAuthorize("authentication.principal.demo() and hasAnyRole('MANAGER', 'ADMIN')")
    @GetMapping("/admin/users")
    public List<AdminService.User> users(@RequestParam(defaultValue = "0") int page) {
        return admin.users(page);
    }

    @org.springframework.security.access.prepost.PreAuthorize("authentication.principal.demo() and hasAnyRole('MANAGER', 'ADMIN')")
    @GetMapping("/admin/summary")
    public AdminService.Summary summary() { return admin.summary(); }

    @org.springframework.security.access.prepost.PreAuthorize("authentication.principal.demo() and hasRole('ADMIN')")
    @PatchMapping("/admin/users/{id}")
    public AdminService.User change(@AuthenticationPrincipal AuthenticatedUser actor,
                                    @PathVariable UUID id, @Valid @RequestBody AdminService.Change change) {
        return admin.change(actor, id, change);
    }

    @org.springframework.security.access.prepost.PreAuthorize("authentication.principal.demo() and hasRole('ADMIN')")
    @GetMapping("/audit/events")
    public List<AdminService.Event> events(@RequestParam(defaultValue = "0") int page) {
        return admin.events(page);
    }
}

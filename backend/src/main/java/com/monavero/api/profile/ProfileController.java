package com.monavero.api.profile;

import com.monavero.api.auth.AuthDtos;
import com.monavero.api.auth.AuthenticatedUser;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/profile")
public class ProfileController {
    private final ProfileService profile;
    public ProfileController(ProfileService profile) { this.profile = profile; }

    @PatchMapping
    public AuthDtos.Profile rename(@AuthenticationPrincipal AuthenticatedUser principal,
                                   @Valid @RequestBody ProfileService.NameRequest request) {
        return profile.rename(principal, request);
    }

    @PostMapping("/password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void changePassword(@AuthenticationPrincipal AuthenticatedUser principal,
                               @Valid @RequestBody ProfileService.PasswordRequest request) {
        profile.changePassword(principal, request);
    }

    @GetMapping("/sessions")
    public List<ProfileService.Session> sessions(@AuthenticationPrincipal AuthenticatedUser principal) {
        return profile.sessions(principal);
    }

    @DeleteMapping("/sessions/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void revokeSession(@AuthenticationPrincipal AuthenticatedUser principal, @PathVariable UUID id) {
        profile.revokeSession(principal, id);
    }
}

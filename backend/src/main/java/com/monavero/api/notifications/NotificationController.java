package com.monavero.api.notifications;

import com.monavero.api.auth.AuthenticatedUser;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/notifications")
public class NotificationController {
    private final NotificationService notifications;

    public NotificationController(NotificationService notifications) { this.notifications = notifications; }

    @GetMapping
    public List<NotificationService.Item> list(@AuthenticationPrincipal AuthenticatedUser principal) {
        return notifications.list(principal.id());
    }

    @PatchMapping("/{id}/read")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void markRead(@AuthenticationPrincipal AuthenticatedUser principal, @PathVariable UUID id) {
        notifications.markRead(principal.id(), id);
    }

    @PatchMapping("/read-all")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void markAllRead(@AuthenticationPrincipal AuthenticatedUser principal) {
        notifications.markAllRead(principal.id());
    }
}

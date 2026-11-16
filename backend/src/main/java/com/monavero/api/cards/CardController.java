package com.monavero.api.cards;

import com.monavero.api.auth.AuthenticatedUser;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/cards")
public class CardController {
    private final CardService cards;
    public CardController(CardService cards) { this.cards = cards; }

    @GetMapping
    public List<CardService.Card> list(@AuthenticationPrincipal AuthenticatedUser principal) {
        return cards.list(principal);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CardService.Card create(@AuthenticationPrincipal AuthenticatedUser principal,
                                   @Valid @RequestBody CardService.CreateRequest request) {
        return cards.create(principal, request);
    }

    @PatchMapping("/{id}/{action}")
    public CardService.Card change(@AuthenticationPrincipal AuthenticatedUser principal,
                                   @PathVariable UUID id, @PathVariable String action) {
        return cards.change(principal, id, action);
    }
}

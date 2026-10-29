package com.monavero.api.accounts;

import com.monavero.api.auth.AuthenticatedUser;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/banking")
public class BankingController {
    private final BankingService banking;
    public BankingController(BankingService banking) { this.banking = banking; }

    @GetMapping("/overview")
    public BankingDtos.Overview overview(@AuthenticationPrincipal AuthenticatedUser user) {
        return banking.overview(user);
    }
}

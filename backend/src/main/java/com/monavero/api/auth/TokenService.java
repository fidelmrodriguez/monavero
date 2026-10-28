package com.monavero.api.auth;

import com.monavero.api.identity.AppUser;
import com.monavero.api.identity.UserStatus;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TokenService {
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final int TOKEN_BYTES = 32;
    private final AuthSessionRepository sessions;

    public TokenService(AuthSessionRepository sessions) { this.sessions = sessions; }

    @Transactional
    public AuthDtos.LoginResponse issue(AppUser user) {
        byte[] bytes = new byte[TOKEN_BYTES];
        RANDOM.nextBytes(bytes);
        String raw = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        OffsetDateTime expiry = now.plusHours(12);
        sessions.save(new AuthSession(user, digest(raw), now, expiry));
        return new AuthDtos.LoginResponse(raw, expiry, profile(user));
    }

    @Transactional(readOnly = true)
    public Optional<AuthenticatedUser> authenticate(String token) {
        if (token == null || token.length() != 43 || !token.matches("[A-Za-z0-9_-]{43}")) {
            return Optional.empty();
        }
        String hash = digest(token);
        return sessions.findByTokenHashAndRevokedAtIsNullAndExpiresAtAfter(
                hash, OffsetDateTime.now(ZoneOffset.UTC))
            .map(AuthSession::getUser)
            .filter(user -> user.getStatus() == UserStatus.ACTIVE)
            .map(user -> new AuthenticatedUser(user.getId(), user.getEmail(),
                user.getFullName(), user.getAccessRole(), user.isDemo(), hash));
    }

    @Transactional
    public void revoke(AuthenticatedUser user) {
        sessions.findByTokenHashAndRevokedAtIsNullAndExpiresAtAfter(
                user.tokenHash(), OffsetDateTime.now(ZoneOffset.UTC))
            .ifPresent(session -> session.revoke(OffsetDateTime.now(ZoneOffset.UTC)));
    }

    public static AuthDtos.Profile profile(AppUser user) {
        return new AuthDtos.Profile(user.getId(), user.getEmail(), user.getFullName(),
            user.getAccessRole(), user.isDemo());
    }

    private static String digest(String token) {
        try {
            byte[] bytes = MessageDigest.getInstance("SHA-256")
                .digest(token.getBytes(StandardCharsets.US_ASCII));
            return HexFormat.of().formatHex(bytes);
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 indisponível", ex);
        }
    }
}

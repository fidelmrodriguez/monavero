package com.monavero.api.auth;

import com.monavero.api.identity.AccessRole;
import java.util.UUID;

public record AuthenticatedUser(UUID id, String email, String fullName,
                                AccessRole role, boolean demo, String tokenHash) { }

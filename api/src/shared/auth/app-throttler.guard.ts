import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

// ─────────────────────────────────────────────────────────────────────────────
// Rate limiting is critical production security (anti-spam registration,
// anti-brute-force login) and must NEVER be weakened by default. This guard
// adds exactly one narrow, opt-in exception: a shared-secret header that lets
// the E2E test suite (Robot Framework, run against a real deployment) create
// its many throw-away fixture accounts without tripping the same limits a
// real attacker would hit.
//
// Safety properties:
//   • Disabled unless TEST_BYPASS_TOKEN is set in the API's environment.
//     An empty/unset value (the default in every real deployment) makes this
//     guard behave EXACTLY like the stock ThrottlerGuard — zero behavior change.
//   • Even when set, a request must present the exact token in the
//     X-Test-Bypass header — guessable only by whoever holds the secret.
//   • Never document/ship a real value; treat it like any other credential
//     (random, per-environment, rotated, never used in production).
// ─────────────────────────────────────────────────────────────────────────────
@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    const token = process.env.TEST_BYPASS_TOKEN;
    if (!token) return false; // feature fully inert unless explicitly configured

    const req = context.switchToHttp().getRequest();
    const provided = req.headers?.['x-test-bypass'];
    return typeof provided === 'string' && provided.length > 0 && provided === token;
  }
}

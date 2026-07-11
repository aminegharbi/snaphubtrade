import { SetMetadata } from '@nestjs/common';

// Marks an endpoint as not requiring authentication.
// Use sparingly — only for genuinely public, read-only endpoints
// (public catalog browsing, public search, health checks).
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

import {
  type MiddlewareConsumer,
  Module,
  type NestModule,
  RequestMethod,
} from '@nestjs/common';
import { AuthMiddleware } from './auth.middleware';

/**
 * AuthModule mounts the Better-Auth request handler at /auth/*.
 * No controllers needed — Better-Auth handles routing internally.
 *
 * All auth API endpoints will be at:
 *   POST /auth/sign-in/email
 *   POST /auth/sign-up/email
 *   POST /auth/sign-out
 *   GET  /auth/session
 *   GET  /auth/organization/...
 *   (and more from the Better-Auth plugins)
 */
@Module({})
export class AuthModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(AuthMiddleware)
      .forRoutes({ path: 'auth/*path', method: RequestMethod.ALL });
  }
}

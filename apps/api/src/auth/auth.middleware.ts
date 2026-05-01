import { Injectable, type NestMiddleware } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './auth.config';

const betterAuthHandler = toNodeHandler(auth);

/**
 * Proxies all /auth/* requests to the Better-Auth handler.
 * This middleware is mounted before NestJS guards so that auth
 * endpoints (sign-in, sign-up, session, etc.) bypass DI entirely.
 *
 * Registered in AuthModule via MiddlewareConsumer.
 */
@Injectable()
export class AuthMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    void betterAuthHandler(req, res).then(next).catch(next);
  }
}

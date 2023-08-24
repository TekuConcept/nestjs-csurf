/*!
 * nestjs-csrf
 * Copyright(c) 2023 Chris Walker
 * MIT Licensed
 */

import { Request } from 'express'
import {
    Injectable,
    CanActivate,
    ExecutionContext,
    Optional,
    HttpStatus,
} from '@nestjs/common'
import {
    CsrfContext,
    CsrfMiddleware,
    CsrfMiddlewareOptions,
} from './csrf.middleware'
import 'reflect-metadata'

@Injectable()
export class CsrfGuard implements CanActivate {
    private context: CsrfContext

    constructor(@Optional() options?: CsrfMiddlewareOptions) {
        this.context = CsrfMiddleware.getContext(options || {})
    }

    canActivate(context: ExecutionContext): boolean {
        const req = context.switchToHttp().getRequest<Request>()
        const res = context.switchToHttp().getResponse()

        // @CsrfCheck(false) - don't perform csrf check
        const csrfIgnoreRoute = !!Reflect.getMetadata('csrf-check-ignore', context.getHandler())
        if (csrfIgnoreRoute) return true

        // @CsrfCheck(true) - perform csrf check regardless of method
        const csrfIncludeRoute = !!Reflect.getMetadata('csrf-check-include', context.getHandler())
        const method = context.switchToHttp().getRequest<Request>().method
        const ignored =
            (method in this.context.methods.ignore) &&
            (this.context.methods.ignore[method])
        if (ignored && !csrfIncludeRoute) return true

        try { return CsrfMiddleware.canActivate(req, this.context) }
        catch (e) {
            res.status(HttpStatus.BAD_REQUEST).json({ msg: e.message })
            return false
        }
    }
}

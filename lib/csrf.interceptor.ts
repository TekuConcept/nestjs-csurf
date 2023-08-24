/*!
 * nestjs-csrf
 * Copyright(c) 2023 Chris Walker
 * MIT Licensed
 */

import {
    CallHandler,
    ExecutionContext,
    Injectable,
    NestInterceptor,
    Optional
} from '@nestjs/common'
import { Request, Response } from 'express'
import { Observable, map } from 'rxjs'
import 'reflect-metadata'
import {
    CsrfContext,
    CsrfMiddleware,
    CsrfMiddlewareOptions
} from './csrf.middleware'

@Injectable()
export class CsrfInterceptor implements NestInterceptor {
    private context: CsrfContext

    constructor(@Optional() options?: CsrfMiddlewareOptions) {
        this.context = CsrfMiddleware.getContext(options || {})
    }

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest<Request>()
        const response = context.switchToHttp().getResponse<Response>()

        // @CsrfGen(true)
        const csrfGenOnRoute = !!Reflect.getMetadata('csrf-gen-include', context.getHandler())
        // @CsrfGenAuth()
        const csrfGenOnAuth = !!Reflect.getMetadata('csrf-gen-auth', context.getHandler())

        const method = request.method.toUpperCase()
        const createOnMethod =
            (method in this.context.methods.create) &&
            (this.context.methods.create[method])
        if (!createOnMethod && !csrfGenOnRoute && !csrfGenOnAuth) {
            return next.handle()
        }

        // @CsrfGen(false)
        const csrfIgnoreOnRoute = !!Reflect.getMetadata('csrf-gen-ignore', context.getHandler())
        if (csrfIgnoreOnRoute) return next.handle()

        return next
        .handle()
        .pipe(map(data => {
            if (csrfGenOnAuth) {
                if (request.isAuthenticated())
                    return this.createToken(data, request, response)
                else return data
            }
            else return this.createToken(data, request, response)
        }))
    }

    private createToken(data: any, req: Request, res: Response) {
        try {
            const token = CsrfMiddleware.generateToken(req, res, this.context)
            res.header('X-CSRF-Token', token)
            return data
        }
        catch (e) {
            res.status(400).send({ msg: e.message })
            return undefined
        }
    }
}

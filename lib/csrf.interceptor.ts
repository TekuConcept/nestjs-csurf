/*!
 * nestjs-csurf
 * Copyright(c) 2023 Chris Walker
 * MIT Licensed
 */

import {
    CallHandler,
    ExecutionContext,
    Inject,
    Injectable,
    NestInterceptor,
    Optional
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { Request, Response } from 'express'
import { Observable, map } from 'rxjs'

export interface CsrfInterceptorOptions {
    /** RESTful Methods to check for CSRF token. */
    methods?: Array<string>
}

const DEFAULT_INCLUDE_METHODS = [ 'GET', 'HEAD', 'OPTIONS' ]

@Injectable()
export class CsrfInterceptor implements NestInterceptor {
    private includeMethods: Array<string>

    constructor(
        @Inject(Reflector) private readonly reflector: Reflector,
        @Optional() options?: CsrfInterceptorOptions
    ) {
        const opts = options || {}
        this.includeMethods = opts.methods || DEFAULT_INCLUDE_METHODS
        for (let i = 0; i < this.includeMethods.length; i++) {
            this.includeMethods[i] = this.includeMethods[i].toUpperCase()
        }
    }

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        // @CsrfGen(true)
        const csrfGenOnRoute = !!this.reflector.get<boolean>('csrf-gen-include', context.getHandler())
        // @CsrfGen(false)
        const csrfIgnoreOnRoute = !!this.reflector.get<boolean>('csrf-gen-ignore', context.getHandler())
        const request = context.switchToHttp().getRequest<Request>()

        if (csrfIgnoreOnRoute) return next.handle()

        return next
        .handle()
        .pipe(
            map(data => {
                if (this.includeMethods.includes(request.method) || csrfGenOnRoute) {
                    const response = context.switchToHttp().getResponse<Response>()
                    // @ts-ignore - can't get library typings right for this at the moment
                    const token = request.csrfToken()
                    response.header('X-CSRF-Token', token)
                }

                return data
            }),
        )
    }
}

/*!
 * csurf
 * Copyright(c) 2011 Sencha Inc.
 * Copyright(c) 2014 Jonathan Ong
 * Copyright(c) 2014-2016 Douglas Christopher Wilson
 * Copyright(c) 2023 Chris Walker
 * MIT Licensed
 */

import {
    Injectable,
    CanActivate,
    ExecutionContext,
    Inject,
    Optional,
    InternalServerErrorException,
    ForbiddenException
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { CookieOptions, Request, Response } from 'express'
import { CsrfGeneratorOptions } from './csrf.generator'
import CookieSignature from 'cookie-signature'
import CsrfGenerator from './csrf.generator'
import Cookie from 'cookie'

export interface CsrfCookieOptions extends CookieOptions {
    key?: string
}

export type CsrfValueFrom = (req: Request) => string

export interface CsrfGuardOptions extends CsrfGeneratorOptions {
    cookie?: CsrfCookieOptions | boolean
    sessionKey?: string
    ignoreMethods?: Array<string>
    valueFrom?: CsrfValueFrom
}

interface MethodDictionary { [key: string]: boolean }

interface CsrfGuardContext {
    sessionKey: string
    valueFrom: CsrfValueFrom
    tokenRepo: CsrfGenerator
    cookie: CsrfCookieOptions
    ignoreMethods: MethodDictionary
}

const DEFAULT_COOKIE_OPTIONS: CsrfCookieOptions = { key: '_csrf', path: '/' }
const DEFAULT_IGNORE_METHOD_LIST = [ 'GET', 'HEAD', 'OPTIONS' ]

@Injectable()
export class CsrfGuard implements CanActivate {
    private static globalContext: CsrfGuardContext | undefined = CsrfGuard.getContext()
    private context: CsrfGuardContext

    constructor(
        @Inject(Reflector) private readonly reflector: Reflector,
        @Optional() options?: CsrfGuardOptions
    ) { this.context = CsrfGuard.getContext(options || {}) }

    private static getContext(options?: CsrfGuardOptions) {
        const opts = options || {}
        let context = {...CsrfGuard.globalContext}

        if (!CsrfGuard.globalContext) {
            context = {
                sessionKey: 'session',
                valueFrom: CsrfGuard.defaultValue,
                tokenRepo: new CsrfGenerator(),
                cookie: undefined,
                ignoreMethods: CsrfGuard.getIgnoredMethods(DEFAULT_IGNORE_METHOD_LIST)
            }
            CsrfGuard.globalContext = context
        }

        if (opts.sessionKey) context.sessionKey = opts.sessionKey
        if (opts.valueFrom) context.valueFrom = opts.valueFrom
        if (opts.cookie !== undefined)
            context.cookie = CsrfGuard.getCookieOptions(opts.cookie)
        if (opts.ignoreMethods)
            context.ignoreMethods = CsrfGuard.getIgnoredMethods(opts.ignoreMethods)

        return context
    }

    public static customize(options: CsrfGuardOptions)
    { CsrfGuard.globalContext = CsrfGuard.getContext(options) }

    canActivate(context: ExecutionContext): boolean {
        const req = context.switchToHttp().getRequest<Request>()
        const res = context.switchToHttp().getResponse<Response>()

        // @CsrfCheck(false) - don't perform csrf check
        const csrfIgnoreRoute = !!this.reflector.get<boolean>('csrf-check-ignore', context.getHandler())
        
        // @CsrfCheck(true) - perform csrf check regardless of method
        const csrfIncludeRoute = !!this.reflector.get<boolean>('csrf-check-include', context.getHandler())
        const method = context.switchToHttp().getRequest<Request>().method
        const ignored = (method in this.context.ignoreMethods) && this.context.ignoreMethods[method]
        
        // validate the configuration against request
        const c = JSON.stringify(this.context)
        if (!CsrfGuard.verifyConfiguration(req, this.context)) {
            throw new InternalServerErrorException('invalid csrf configuration')
        }
        
        // get the secret from the request
        let secret = CsrfGuard.getSecret(req, this.context)
        let token: string

        // @ts-ignore - can't get library typings right for this at the moment
        // lazy-load token getter
        req.csrfToken = () => {
            let sec = !this.context.cookie
                ? CsrfGuard.getSecret(req, this.context)
                : secret
            
            // use cached token if secret has not changed
            if (token && sec === secret) return token
            
            // generate & set new secret
            if (sec === undefined) {
                sec = this.context.tokenRepo.secretSync()
                CsrfGuard.setSecret(req, res, sec, this.context)
            }
            
            // update changed secret
            secret = sec
            
            // create new token
            token = this.context.tokenRepo.create(secret)
            
            return token
        }
        
        // generate & set secret
        if (!secret) {
            secret = this.context.tokenRepo.secretSync()
            CsrfGuard.setSecret(req, res, secret, this.context)
        }
        
        // these checks need to happen after csrfToken() is defined
        // otherwise you'll get "request.csrfToken is not a function"
        if (csrfIgnoreRoute) return true
        if (ignored && !csrfIncludeRoute) return true

        // verify the incoming token
        const value = this.context.valueFrom(req)
        const result = this.context.tokenRepo.verify(secret, value)
        if (!result) throw new ForbiddenException('invalid csrf token')

        return true
    }

    private static defaultValue(req: Request): string {
        return (req.body && req.body._csrf) ||
            (req.query && req.query._csrf) ||
            (req.headers['csrf-token']) ||
            (req.headers['xsrf-token']) ||
            (req.headers['x-csrf-token']) ||
            (req.headers['x-xsrf-token'])
    }

    /** Get options for cookie. */
    private static getCookieOptions(options: boolean | CookieOptions) {
        if (!options) return undefined

        const opts: CsrfCookieOptions = { ...DEFAULT_COOKIE_OPTIONS }

        if (typeof options === 'object') {
            for (const prop in options) {
                const value = options[prop]
                if (value !== undefined) opts[prop] = value
            }
        }

        return opts
    }

    /** Get a lookup of ignored methods. */
    private static getIgnoredMethods(methods: Array<string>) {
        const result: MethodDictionary = {}

        methods.forEach(m => {
            const method = m.toUpperCase()
            result[method] = true
        })

        return result
    }

    /** Verify the configuration against the request. */
    private static verifyConfiguration(
        req: Request,
        context: CsrfGuardContext
    ): boolean {
        if (!CsrfGuard.getSecretBag(req, context)) return false
        if (context.cookie && context.cookie.signed && !req.secret) return false
        return true
    }

    /** Get the token secret bag from the request. */
    private static getSecretBag(
        req: Request,
        context: CsrfGuardContext
    ): string {
        // get secret from cookie
        if (context.cookie) {
            const cookieKey = context.cookie.signed
                ? 'signedCookies'
                : 'cookies'

            return req[cookieKey]
        }
        // get secret from session
        else return req[context.sessionKey]
    }

    /** Get the token secret from the request. */
    private static getSecret(
        req: Request,
        context: CsrfGuardContext
    ): string {
        const bag = CsrfGuard.getSecretBag(req, context)
        const key = context.cookie?.key || 'csrfSecret'

        if (!bag) throw new InternalServerErrorException('misconfigured csrf')

        return bag[key] as string
    }

    /** Set the token secret on the request. */
    private static setSecret(
        req: Request,
        res: Response,
        val: string,
        context: CsrfGuardContext
    ): void {
        // set secret on cookie
        if (context.cookie) {
            let value = val

            if (context.cookie.signed) {
                const secret = req.secret
                if (!secret) throw new Error('misconfigured csrf')
                value = 's:' + CookieSignature.sign(val, secret)
            }

            CsrfGuard.setCookie(res, value, context.cookie.key as string, context.cookie)
        }
        // set secret on session
        else if (req[context.sessionKey])
            req[context.sessionKey].csrfSecret = val
        else throw new Error('misconfigured csrf')
    }

    /** Set a cookie on the HTTP response. */
    private static setCookie(
        res: Response,
        name: string,
        val: string,
        options: CsrfCookieOptions
    ) {
        const data = Cookie.serialize(name, val, options)
        const prev = res.getHeader('set-cookie') as (string | Array<string>) || new Array<string>()

        let header: string[]
        if (Array.isArray(prev)) header = prev.concat(data)
        else if (Array.isArray(data)) header = [prev].concat(data)
        else header = [prev, data]

        res.setHeader('set-cookie', header)
    }
}

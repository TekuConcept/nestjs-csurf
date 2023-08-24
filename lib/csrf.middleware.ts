/// <reference path="./types/express-request.d.ts" />

/*!
 * csurf
 * Copyright(c) 2011 Sencha Inc.
 * Copyright(c) 2014 Jonathan Ong
 * Copyright(c) 2014-2016 Douglas Christopher Wilson
 * Copyright(c) 2023 Chris Walker
 * MIT Licensed
 */

import { CsrfGenerator, CsrfGeneratorOptions } from './csrf.generator'
import { CookieOptions, Request, Response } from 'express'
import * as Cookie from 'cookie'
import * as CookieSignature from 'cookie-signature'

export type CsrfValueFrom = (req: Request) => string

export interface CsrfCookieOptions extends CookieOptions {
    key?: string
}

export interface CsrfMiddlewareOptions extends CsrfGeneratorOptions {
    cookie?: CsrfCookieOptions | boolean
    sessionKey?: string
    valueFrom?: CsrfValueFrom

    methods?: {
        create?: Array<string>
        validate?: Array<string>
    }
}

export interface MethodDictionary { [key: string]: boolean }

export interface CsrfContext {
    sessionKey: string
    valueFrom: CsrfValueFrom
    tokenRepo: CsrfGenerator
    cookie: CsrfCookieOptions
    methods: {
        create: MethodDictionary
        ignore: MethodDictionary
    }
}

const DEFAULT_COOKIE_OPTIONS: CsrfCookieOptions = { key: '_csrf', path: '/' }
const DEFAULT_VALIDATE_METHODS = [ 'GET', 'HEAD', 'OPTIONS' ]
const DEFAULT_CREATE_METHODS = [ 'GET', 'HEAD', 'OPTIONS' ]

let csrfContext: CsrfContext | undefined = undefined

getCsrfContext()

function getCsrfContext(options?: CsrfMiddlewareOptions) {
    const opts = options || {}
    let context: CsrfContext

    if (!csrfContext) {
        context = {
            sessionKey: 'session',
            valueFrom: defaultValueFrom,
            tokenRepo: new CsrfGenerator(),
            cookie: undefined,
            methods: {
                create: getMethodTable(DEFAULT_CREATE_METHODS),
                ignore: getMethodTable(DEFAULT_VALIDATE_METHODS)
            }
        }
        csrfContext = context
    }

    context = {...csrfContext}

    if (opts.sessionKey) context.sessionKey = opts.sessionKey
    if (opts.valueFrom) context.valueFrom = opts.valueFrom
    if (opts.cookie !== undefined)
        context.cookie = getCookieOptions(opts.cookie)
    if (opts.methods) {
        if (opts.methods.create)
            context.methods.create = getMethodTable(opts.methods.create)
        if (opts.methods.validate)
            context.methods.ignore = getMethodTable(opts.methods.validate)
    }

    return context
}

function customize(options: CsrfMiddlewareOptions) {
    csrfContext = getCsrfContext(options)
}

function defaultValueFrom(req: Request): string {
    return (req.body && req.body._csrf) ||
        (req.query && req.query._csrf) ||
        (req.headers['csrf-token']) ||
        (req.headers['xsrf-token']) ||
        (req.headers['x-csrf-token']) ||
        (req.headers['x-xsrf-token'])
}

/** Get options for cookie. */
function getCookieOptions(options: boolean | CookieOptions) {
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
function getMethodTable(methods: Array<string>) {
    const result: MethodDictionary = {}

    methods.forEach(m => {
        const method = m.toUpperCase()
        result[method] = true
    })

    return result
}

function assertNoSessionOrCookie() {
    throw new Error('no session or cookie exists for this request')
}

function assertNoCsrfSecret() {
    throw new Error('no csrf secret exists for this request')
}

/** Get the token secret from the request. */
function getSecret(req: Request, context: CsrfContext): string {
    const bag = getSecretBag(req, context)
    const key = context.cookie?.key || 'csrfSecret'

    if (!bag) assertNoSessionOrCookie()
    if (!(key in bag) || !bag[key]) assertNoCsrfSecret()

    return bag[key] as string
}

/** Set the token secret on the request. */
function setSecret(
    req: Request,
    res: Response,
    val: string,
    context: CsrfContext
): void {
    // set secret on cookie
    if (context.cookie) {
        let value = val

        if (context.cookie.signed) {
            const secret = req.secret as string
            if (!secret) assertNoCsrfSecret()
            value = 's:' + CookieSignature.sign(val, secret)
        }

        setCookie(res, value, context.cookie.key as string, context.cookie)
    }
    // set secret on session
    else if (req[context.sessionKey])
        req[context.sessionKey].csrfSecret = val
    else assertNoSessionOrCookie()
}

/** Get the token secret bag from the request. */
function getSecretBag(req: Request, context: CsrfContext): object {
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

/** Set a cookie on the HTTP response. */
function setCookie(
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

/** Verify the incoming token */
function canActivate(req: Request, context: CsrfContext) {
    const token = context.valueFrom(req)
    let secret = getSecret(req, context)
    return context.tokenRepo.verify(secret, token)
}

function generateToken(req: Request, res: Response, context: CsrfContext) {
    const secret = context.tokenRepo.secretSync()
    const token = context.tokenRepo.create(secret)
    setSecret(req, res, secret, context)
    return token
}

export const CsrfMiddleware = {
    customize,
    getContext: getCsrfContext,
    getMethodTable,
    canActivate,
    generateToken,
}

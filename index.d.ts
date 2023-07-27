// / <reference types="@nestjs/core" />

// import { CustomDecorator } from '@nestjs/common'
// import { CookieOptions, Request } from 'express'
// import { Reflector } from '@nestjs/core'
// import express = require('@nestjs/common')

declare module '@tekuconcept/nestjs-csrf' {
    function test(): void

    /****************************************************************\
    |*                            MODULE                            *|
    \****************************************************************/

    class CsrfModule {}

    /****************************************************************\
    |*                          DECORATORS                          *|
    \****************************************************************/

    /**
     * True:  Performs a csrf check.
     *        Throws a Forbidden exception if the check fails.
     * False: No check is performed.
     * No @CsrfCheck reverts to the guard's default check pattern.
     */
    const CsrfCheck: (enabled?: boolean) => CustomDecorator<string>

    /**
     * True:  Generates a new csrf token.
     *        Set's the response header with `X-CSRF-Token: token`
     * False: No token is generated.
     * No @CsrfGen reverts to the interceptor's default gen pattern.
     */
    const CsrfGen: (enabled?: boolean) => CustomDecorator<string>

    /****************************************************************\
    |*                       OPTIONS N STUFF                        *|
    \****************************************************************/

    /** Callback to read the token from the request object. */
    export type CsrfValueFrom = (req: Request) => string

    /** See https://expressjs.com/en/4x/api.html#req.cookies */
    export interface CsrfCookieOptions extends CookieOptions {
        /**
         * The name of the cookie to use to store the token secret
         * (defaults to '_csrf')
         */
        key?: string
    }

    /** Specifies the local and global csrf guard settings. */
    export interface CsrfGuardOptions extends CsrfGeneratorOptions {
        /**
         * Determines if the token secret for the user should be stored
         * in a cookie or in req.session. Defaults to storing in the
         * session, eg. cookie = false.
         * 
         * When set to true (or an object of options for the cookie),
         * then the module changes behavior and no longer uses
         * req.session. This means you are no longer required to use a
         * session middleware. Instead, you do need to use the
         * cookie-parser middleware in your app.
         * 
         * When set to an object, cookie storage of the secret is
         * enabled and the object contains options for this
         * functionality (when set to true, the defaults for the
         * options are used).
         */
        cookie?: CsrfCookieOptions | boolean

        /**
         * Determines what property ("key") on req the session object is
         * located. Defaults to 'session' (i.e. looks at req.session).
         * The CSRF secret from this library is stored and read as
         * req[sessionKey].csrfSecret.
         * 
         * If the "cookie" option is not false, then this option does
         * nothing.
         */
        sessionKey?: string

        /**
         * An array of the methods for which CSRF token checking will
         * be disabled. Defaults to ['GET', 'HEAD', 'OPTIONS'].
         */
        ignoreMethods?: Array<string>

        /**
         * A function that the middleware will invoke to read the
         * token from the request for validation. The function is
         * called as valueFrom(req) and is expected to return the
         * token as a string.
         */
        valueFrom?: CsrfValueFrom
    }

    /** Specifies the interceptor's token generation pattern. */
    export interface CsrfInterceptorOptions {
        /** RESTful Methods to check for CSRF token. */
        methods?: Array<string>
    }

    /****************************************************************\
    |*                         GATE KEEPERS                         *|
    \****************************************************************/

    /** Validates CSRF tokens from inbound requests */
    export class CsrfGuard implements CanActivate {
        private static globalContext: CsrfGuardContext | undefined = CsrfGuard.getContext()
        private context: CsrfGuardContext

        constructor(options?: CsrfGuardOptions)

        /** Sets the guard's global settings */
        static customize(options: CsrfGuardOptions): void

        canActivate(context: ExecutionContext): boolean
    }

    /** Generates new CSRF tokens for outbound responses */
    export class CsrfInterceptor implements NestInterceptor {
        constructor(options?: CsrfInterceptorOptions)
    
        intercept(context: ExecutionContext, next: CallHandler): Observable<any>
    }    
}

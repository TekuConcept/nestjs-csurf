/*!
 * csrf
 * Copyright(c) 2014 Jonathan Ong
 * Copyright(c) 2015 Douglas Christopher Wilson
 * Copyright(c) 2023 Chris Walker
 * MIT Licensed
 */

import rndm from 'rndm'
import uid from 'uid-safe'
import compare from 'tsscmp'
import crypto from 'crypto'

const EQUAL_GLOBAL_REGEXP = /=/g
const PLUS_GLOBAL_REGEXP  = /\+/g
const SLASH_GLOBAL_REGEXP = /\//g

export interface CsrfGeneratorOptions {
    /** The string length of the salt */
    saltLength?: number

    /** The byte length of the secret key */
    secretLength?: number
}

/** Token generation/verification class. */
export default class CsrfGenerator {
    private saltLength: number
    private secretLength: number

    constructor(options?: CsrfGeneratorOptions) {
        const opts = options || {}

        const saltLength = opts.saltLength !== undefined
            ? opts.saltLength
            : 8

        const secretLength = opts.secretLength !== undefined
            ? opts.secretLength
            : 18

        if (!isFinite(saltLength) || saltLength < 1) {
            throw new TypeError('option saltLength must be finite number > 1')
        }

        if (!isFinite(secretLength) || secretLength < 1) {
            throw new TypeError('option secretLength must be finite number > 1')
        }

        this.saltLength = saltLength
        this.secretLength = secretLength
    }

    /** Create a new CSRF token. */
    create(secret: string): string {
        if (!secret) throw new TypeError('argument secret is required')
        return this._tokenize(secret, rndm(this.saltLength))
    }

    /** Create a new secret key. */
    secret(): Promise<string> {
        return uid(this.secretLength)
    }

    /** Create a new secret key synchronously. */
    secretSync(): string {
        return uid.sync(this.secretLength)
    }

    /** Tokenize a secret and salt. */
    private _tokenize(secret: string, salt: string): string {
        return salt + '-' + CsrfGenerator.hash(salt + '-' + secret)
    }

    /** Verify if a given token is valid for a given secret. */
    verify(secret: string, token: string): boolean {
        if (!secret || !token) return false

        const index = token.indexOf('-')
        if (index === -1) return false

        const salt = token.substring(0, index)
        const expected = this._tokenize(secret, salt)

        return compare(token, expected)
    }

    /** Hash a string with SHA1, returning url-safe base64 */
    private static hash(str: string): string {
        return crypto
            .createHash('sha1')
            .update(str, 'ascii')
            .digest('base64')
            .replace(PLUS_GLOBAL_REGEXP, '-')
            .replace(SLASH_GLOBAL_REGEXP, '_')
            .replace(EQUAL_GLOBAL_REGEXP, '')
    }
}

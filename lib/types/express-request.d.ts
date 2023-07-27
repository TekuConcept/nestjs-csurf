
declare global {
    namespace Express {
        interface Request {
            /**
             * Generates a new CSRF token and appends the
             * secret to the current cookie or session.
             * @returns {string} The new token.
             */
            csrfToken(): string

            /**
             * Returns the current CSRF token.
             */
            secret?: string
        }
    }
}

import express = require('express')

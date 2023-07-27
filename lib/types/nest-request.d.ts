declare module '@nestjs/common' {
    export interface Request {
        /**
         * Generates a new CSRF token and appends the
         * secret to the current cookie or session.
         * @returns {string} The new token.
         */
        csrfToken?: () => string;
    }
}

import express = require('express')


declare global {
    namespace Express {
        interface Request {
            /**
             * Returns the current CSRF token.
             */
            secret?: string
        }
    }
}

import express = require('express')

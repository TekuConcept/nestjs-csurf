
// Implements Brad Hill's Double HMAC pattern from
// https://www.nccgroup.trust/us/about-us/newsroom-and-events/blog/2011/february/double-hmac-verification/.
// The approach is similar to the node's native implementation of timing safe buffer comparison that will be available on v6+.
// https://github.com/nodejs/node/issues/3043
// https://github.com/nodejs/node/pull/3073

import * as crypto from 'crypto'

function bufferEqual(a: Buffer, b: Buffer) {
    if (a.length !== b.length) return false

    // `crypto.timingSafeEqual` was introduced in Node v6.6.0
    // <https://github.com/jshttp/basic-auth/issues/39>
    if (crypto.timingSafeEqual)
        return crypto.timingSafeEqual(a, b)

    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false
    }

    return true
}

function timeSafeCompare(a: string, b: string) {
    const sa = String(a)
    const sb = String(b)
    const key = crypto.pseudoRandomBytes(32)
    const ah = crypto.createHmac('sha256', key).update(sa).digest()
    const bh = crypto.createHmac('sha256', key).update(sb).digest()

    return bufferEqual(ah, bh) && a === b
}

export default timeSafeCompare

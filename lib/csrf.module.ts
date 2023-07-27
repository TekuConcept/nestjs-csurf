/*!
 * nestjs-csurf
 * Copyright(c) 2023 Chris Walker
 * MIT Licensed
 */

import { Module } from '@nestjs/common'
import { CsrfGuard } from './csrf.guard'
import { CsrfInterceptor } from './csrf.interceptor'

@Module({ providers: [CsrfGuard, CsrfInterceptor] })
export class CsrfModule {}

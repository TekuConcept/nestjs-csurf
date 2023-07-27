import cookieParser from 'cookie-parser'
import session from 'express-session'
import { Module } from '@nestjs/common'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { createModule } from 'create-nestjs-middleware-module'
import { CsrfModule } from '@tekuconcept/nestjs-csrf'

const CookieParserModuleBase = createModule(() => {
    return cookieParser()
})

const SessionModuleBase = createModule(() => {
    return session({
        secret: 'my-secret-session-key',
        resave: false,
        saveUninitialized: true,
    })
})

@Module({
    imports: [
        CookieParserModuleBase.forRoot({}),
        SessionModuleBase.forRoot({}),
        CsrfModule
    ],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {}

import {
    Controller,
    Get,
    Post,
    UseGuards,
    UseInterceptors
} from '@nestjs/common'
import { AppService } from './app.service'
import {
    CsrfGuard,
    CsrfInterceptor,
    CsrfCheck,
    CsrfGen
} from '@tekuconcept/nestjs-csrf'

@Controller()
@UseGuards(CsrfGuard)
@UseInterceptors(CsrfInterceptor)
export class AppController {
    constructor(private readonly appService: AppService) {}

    /**
     * CSRF token is auto-generated by the interceptor.
     * This is the same as adding @CsrfGen(true) to the route.
     */
    @Get()
    getHello(): string {
        const result = this.appService.getHello()
        console.log(result)
        return result
    }

    /**
     * CSRF check is automatically performed by the guard.
     * This is the same as adding @CsrfCheck(true) to the route.
     */
    @Post()
    postThankyou(): string {
        const result = this.appService.postThankyou()
        console.log(result)
        return result
    }

    /** We won't generate a CSRF token for this route. */
    @Get('de')
    @CsrfGen(false)
    getGutenMorgen(): string {
        const result = this.appService.getGutenMorgen()
        console.log(result)
        return result
    }

    /** And we won't perform a CSRF validity check on this route. */
    @Post('de')
    @CsrfCheck(false)
    postDanke(): string {
        const result = this.appService.postDanke()
        console.log(result)
        return result
    }
}

import { Injectable } from '@nestjs/common'

@Injectable()
export class AppService {
    getHello(): string {
        return 'Hello World!'
    }

    postThankyou(): string {
        return 'Thank You!'
    }

    getGutenMorgen(): string {
        return 'Guten Morgen!'
    }

    postDanke(): string {
        return 'Danke!'
    }
}

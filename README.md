# nestjs-csrf

[![NPM Latest Release](https://img.shields.io/npm/v/@tekuconcept/nestjs-csrf.svg)]()
[![NestJS Version](https://img.shields.io/badge/nestjs-%5E10.0.0-green)](https://nestjs.com/)
[![GitHub Repo stars](https://img.shields.io/github/stars/TekuConcept/nestjs-csurf?style=social)](https://github.com/TekuConcept/nestjs-csurf)

Nest.js [CSRF](https://en.wikipedia.org/wiki/Cross-site_request_forgery) protection module.

Based on the original express-csurf package.\
Organized for simple integration into NestJS servers.

Requires either a session middleware or [cookie-parser](https://www.npmjs.com/package/cookie-parser) to be initialized first.

  * If you are setting the ["cookie" option](#cookie) to a non-`false` value,
    then you must use [cookie-parser](https://www.npmjs.com/package/cookie-parser)
    before this module.
  * Otherwise, you must use a session middleware before this module. For example:
    - [express-session](https://www.npmjs.com/package/express-session)
    - [cookie-session](https://www.npmjs.com/package/cookie-session)



## Installation

This is a [Nest.js](https://nestjs.com/) module available through the
[npm registry](https://www.npmjs.com/). Installation is done using the
[`npm install` command](https://docs.npmjs.com/getting-started/installing-npm-packages-locally):

```sh
$ npm install @tekuconcept/nestjs-csrf
```



## Examples

An example NestJS project is included in the [example](/example) directory, which demonstrates how to setup a project with CSRF token generation and validation.

If you use VSCode, install the `REST Client` and use the accompanying [app.rest](/example/src/app.rest) template to send requests and review the respective responses. Alternatively, use Postman or similar to make the requests. :)



## API

Minimalistic - only customize as needed.



### Adding the module providers

```ts
// createModule from create-nestjs-middleware-module
// provides a builder for native middleware; this is
// the same as `app.use(session(...))`
const SessionModuleBase = createModule(() => {
    return session({
        secret: 'my-secret-session-key',
        resave: false,
        saveUninitialized: true,
    })
})


// Load your session module first!
@Module({
    imports: [
        SessionModuleBase.forRoot({}),
        CsrfModule
    ],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {}
```



### Creating an Interceptor

Interceptors will automate the process of generating new CSRF tokens.
These tokens are validated against the visitor's session or csrf cookie.
They may be added per controller using the nest decorator as follows:

```ts
@Controller()
@UseInterceptors(CsrfInterceptor)
export class AppController {}
```

By default, tokens will only be generated for GET, HEAD, and OPTIONS request methods. To generate for other methods, create an instance
as follows:

```ts
@Controller()
@UseInterceptors(new CsrfInterceptor({
    methods: { create: [ 'GET', 'POST' ] }
}))
export class AppController {}
```
The above code will generate a new token for both GET and POST requests.



### Fine-grained interceptor control

For more fine-grained control over which routes should or should not
generate CSRF tokens, use the route decorator `@CsrfGen`.

- Default interceptor behavior is used when no decorator is given
- `@CsrfGen(true)` will generate a new token regardless of the method
- `@CsrfGen(false)` will treat the route as a normal, vanilla route

```ts
@Controller()
@UseInterceptors(CsrfInterceptor)
export class AppController {
    // Will generate a token because GET is a default method
    @Get('first')
    first(): string { return 'first' }

    // Will not generate a token even though it is GET
    @Get('second')
    @CsrfGen(false)
    second(): string { return 'second' }

    // Will generate a token despite being a POST method
    @Post('third')
    @CsrfGen(true)
    third(): string { return 'third' }
}
```

For special case scenarios one may opt to only generate a token when authenticated. Use the `@CsrfGenAuth()` decorator for this task.

```ts
@Controller()
@UseInterceptors(CsrfInterceptor)
export class AppController {
    // Will generate a token but only if the user can login
    @Post('login')
    @UseGuards(LocalAuthGuard)
    @CsrfGenAuth()
    login(): string { return req.user }

    ...
}
```


### Creating a Guard

Guards will automate the CSRF validation process.

They may be applied at both the controller level...

```ts
@Controller()
@UseGuards(CsrfGuard)
export class AppController {}
```

...as well as to each individual route

```ts
@Controller()
export class AppController {
    @Post()
    @UseGuards(CsrfGuard)
    update(): string {}
}
```

**NOTE:** When applying the guard to individual routes, only the middleware is applied. That is, the guard itself doesn't know if it is being applied to a GET or a POST route. Therefore, if you apply the guard with default settings, for example, to a GET route, nothing will happen.



### Fine-grained Guard Duty

Very similar to the Interceptor, fine-grained control may also be applied per-route for csrf validation. For this we use the `@CsrfCheck` decorator.

- Default guard behavior is used when no decorator is given
- `@CsrfCheck(true)` will validate a token regardless of the method
- `@CsrfCheck(false)` will treat the route as a normal, vanilla route

```ts
@Controller()
@UseGuard(CsrfGuard)
export class AppController {
    // Will validate a token because POST is a default method
    @Post('first')
    first(): string { return 'first' }

    // Will not validate a token even though it is POST
    @Post('second')
    @CsrfCheck(false)
    second(): string { return 'second' }

    // Will validate a token despite being a GET method
    @Get('third')
    @CsrfCheck(true)
    third(): string { return 'third' }
}
```
...And that's all there is to it!
- `CsrfModule`
- `CsrfInterceptor` and `CsrfGuard`
- `CsrfGen` and `CsrfCheck`



### Options

Options are, well, optional. That being said, there are two levels
where options can be applied: global and local. Where local options are not provided, the guards and interceptors use the global defaults.


Applying options globally:

```ts
async function bootstrap() {
    const globalCsrfOptions: CsrfMiddlewareOptions = { ... }
    CsrfMiddleware.customize(globalCsrfOptions)
    ...
}
```

Applying options per use-case:
```ts
const localConfig = { cookie: true }

@UseGuards(new CsrfGuard(localConfig))
@UseInterceptors(new CsrfInterceptor(localConfig))
```

The following options are available:



#### cookie
```ts
cookie?: CsrfCookieOptions | boolean
```

Determines if the token secret for the user should be stored in a cookie
or in `req.session`. Defaults to storing in the session, eg. `cookie = false`.

When set to `true` (or an object of options for the cookie), then the module
changes behavior and no longer uses `req.session`. This means you _are no
longer required to use a session middleware_. Instead, you do need to use the
[cookie-parser](https://www.npmjs.com/package/cookie-parser) middleware in
your app.

When set to an object, cookie storage of the secret is enabled and the
object contains options for this functionality (when set to `true`, the
defaults for the options are used). The options may contain any of the
following keys:

  - `key` - the name of the cookie to use to store the token secret
    (defaults to `'_csrf'`).
  - `path` - the path of the cookie (defaults to `'/'`).
  - any other [res.cookie](http://expressjs.com/4x/api.html#res.cookie)
    option can be set.



#### methods

```ts
methods?: {
  create?: string[],
  ignore?: string[]
}
```

**create**: An array of methods for which CSRF tokens will be **created**.

Defaults to `[ 'GET', 'HEAD', 'OPTIONS' ]`.

**ignore**: An array of methods for which CSRF token validation will be **ignored**.

Defaults to `[ 'GET', 'HEAD', 'OPTIONS' ]`.



##### sessionKey

```ts
sessionKey?: string
```

Determines what property ("key") on `req` the session object is located.
Defaults to `'session'` (i.e. looks at `req.session`). The CSRF secret
from this library is stored and read as `req[sessionKey].csrfSecret`.

If the ["cookie" option](#cookie) is not `false`, then this option does
nothing.



##### valueFrom

```ts
valueFrom: (req: Request) => string
```

Provide a function that the middleware will invoke to read the token from
the request for validation. The function is called as `valueFrom(req)` and is
expected to return the token as a string.

The default value is a function that reads the token from the following
locations, in order:

  - `req.body._csrf` - typically generated by the `body-parser` module.
  - `req.query._csrf` - a built-in from Express.js to read from the URL
    query string.
  - `req.headers['csrf-token']` - the `CSRF-Token` HTTP request header.
  - `req.headers['xsrf-token']` - the `XSRF-Token` HTTP request header.
  - `req.headers['x-csrf-token']` - the `X-CSRF-Token` HTTP request header.
  - `req.headers['x-xsrf-token']` - the `X-XSRF-Token` HTTP request header.



### Errors

When the CSRF token validation fails, a `ForbiddenException` is returned - as part of the inherent behavior of NestJS guards.

If no session or cookie exists when the guard attempts to validate, a 400 - bad request will be returned. And if the same occurs when the interceptor attempts to generate a new CSRF token, a 500 - internal server error will be returned.



## License

[MIT](LICENSE)

<!-- [![NPM Downloads][downloads-image]][downloads-url] -->
<!-- [![Build status][travis-image]][travis-url] -->
<!-- [![Test coverage][coveralls-image]][coveralls-url] -->
<!-- [travis-image]: https://img.shields.io/travis/expressjs/csurf/master.svg -->
<!-- [travis-url]: https://travis-ci.org/expressjs/csurf -->
<!-- [coveralls-image]: https://img.shields.io/coveralls/expressjs/csurf/master.svg -->
<!-- [coveralls-url]: https://coveralls.io/r/expressjs/csurf?branch=master -->
<!-- [downloads-image]: https://img.shields.io/npm/dm/csurf.svg -->
<!-- [downloads-url]: https://npmjs.org/package/@tekuconcept/nestjs-csrf -->

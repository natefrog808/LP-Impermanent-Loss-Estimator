  $ npm run start
 

load build definition from ./railpack-plan.json
0ms

install mise packages: node cached
0ms

npm install cached
0ms

copy ., package.json cached
0ms

npm run build
14s
npm warn config production Use `--omit=dev` instead.
> lp-impermanent-loss-estimator@0.1.0 build
> tsc
index.ts(320,29): error TS2769: No overload matches this call.

  Overload 1 of 2, '(requestListener?: RequestListener<typeof IncomingMessage, typeof ServerResponse> | undefined): Server<typeof IncomingMessage, typeof ServerResponse>', gave the following error.
    Argument of type '(request: Request, Env?: unknown, executionCtx?: ExecutionContext | undefined) => Response | Promise<Response>' is not assignable to parameter of type 'RequestListener<typeof IncomingMessage, typeof ServerResponse>'.
      Types of parameters 'request' and 'req' are incompatible.
        Type 'IncomingMessage' is missing the following properties from type 'Request': cache, credentials, destination, integrity, and 15 more.
  Overload 2 of 2, '(options: ServerOptions<typeof IncomingMessage, typeof ServerResponse>, requestListener?: RequestListener<typeof IncomingMessage, typeof ServerResponse> | undefined): Server<...>', gave the following error.
    Type '(request: Request, Env?: unknown, executionCtx?: ExecutionContext | undefined) => Response | Promise<Response>' has no properties in common with type 'ServerOptions<typeof IncomingMessage, typeof ServerResponse>'.
Build Failed: bc.Build: failed to solve: process "npm run build" did not complete successfully: exit code: 2

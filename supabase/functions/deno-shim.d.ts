/** The Deno globals the edge functions use, for type-checking under Node. */
declare namespace Deno {
  function serve(handler: (request: Request) => Response | Promise<Response>): void;
  const env: { get(name: string): string | undefined };
}

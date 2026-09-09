/**
 * Ambient type declarations for Supabase Edge Functions.
 *
 * This file provides type definitions for IDEs and TypeScript environments
 * when inspecting Edge Functions outside or prior to the Deno Language Server activation.
 */

declare module "npm:@supabase/supabase-js@2" {
  export * from "@supabase/supabase-js";
}

declare module "jsr:@supabase/supabase-js@2.49.8" {
  export * from "@supabase/supabase-js";
}

declare module "jsr:@supabase/functions-js/edge-runtime.d.ts" {
  // Empty module declaration so the type reference import resolves cleanly
}

declare module "npm:hono" {
  export class Hono {
    use(...args: any[]): any;
    get(path: string, ...handlers: ((c: any) => any)[]): any;
    post(path: string, ...handlers: ((c: any) => any)[]): any;
    put(path: string, ...handlers: ((c: any) => any)[]): any;
    delete(path: string, ...handlers: ((c: any) => any)[]): any;
    [key: string]: any;
  }
}

declare module "npm:hono/cors" {
  export const cors: any;
}

declare module "npm:hono/logger" {
  export const logger: any;
}

declare module "npm:jose@5.9.6" {
  export const createRemoteJWKSet: any;
  export const jwtVerify: any;
}

declare namespace Deno {
  export interface ServeOptions {
    port?: number;
    hostname?: string;
    signal?: AbortSignal;
    onError?: (error: unknown) => Response | Promise<Response>;
    onListen?: (params: { hostname: string; port: number }) => void;
  }

  export interface ServeHandlerInfo {
    remoteAddr: {
      transport: "tcp" | "udp";
      hostname: string;
      port: number;
    };
  }

  export type ServeHandler = (
    request: Request,
    info: ServeHandlerInfo
  ) => Response | Promise<Response>;

  export function serve(handler: ServeHandler): void;
  export function serve(options: ServeOptions, handler: ServeHandler): void;

  export const env: {
    get(key: string): string | undefined;
    set(key: string, value: string): void;
    delete(key: string): void;
    has(key: string): boolean;
    toObject(): Record<string, string>;
  };
}

declare namespace EdgeRuntime {
  export function waitUntil(promise: Promise<any>): void;
}

declare module "npm:pdf-lib" {
  export * from "pdf-lib";
}

declare module "npm:pdf-lib@1.17.9" {
  export * from "pdf-lib";
}


import { Layer, ManagedRuntime } from 'effect';

import { AuthToken } from '@/lib/api/auth';
import { ApiClient } from '@/lib/api/client';
import { AppConfig } from '@/lib/config';

/**
 * Every service the app's effects may use. Add new service layers here with `Layer.mergeAll`.
 * `AuthToken.none` sends no token; an app with sign-in provides `AuthToken.fromGetter(...)`.
 */
export const AppLayer = ApiClient.layer.pipe(
  Layer.provide(Layer.mergeAll(AppConfig.layer, AuthToken.none)),
);

export type AppServices = Layer.Success<typeof AppLayer>;

/** The single runtime that runs every effect in the app (through `runEffect`). */
export const runtime = ManagedRuntime.make(AppLayer);

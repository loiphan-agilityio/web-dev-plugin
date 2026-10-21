import { type Layer, ManagedRuntime } from 'effect';

import { ApiClient } from '@/lib/api/client';

/** Every service the app's effects may use. Add new service layers here with `Layer.mergeAll`. */
export const AppLayer = ApiClient.layer;

export type AppServices = Layer.Success<typeof AppLayer>;

/** The single runtime that runs every effect in the app (through `runEffect`). */
export const runtime = ManagedRuntime.make(AppLayer);

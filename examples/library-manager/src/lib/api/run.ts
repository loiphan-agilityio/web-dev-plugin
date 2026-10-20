import { Cause, type Effect, Exit, Option } from 'effect';

import { type AppServices, runtime } from '@/lib/runtime';

import type { ApiError } from './errors';

/**
 * Runs an effect and returns a Promise for TanStack Query (`queryFn`, `mutationFn`).
 *
 * - Rejects with the effect's own typed error (an `ApiError` instance), so `query.error` can
 *   be switched on by `_tag` instead of being a squashed, untyped value.
 * - Pass the query's `signal`: when TanStack Query cancels, the fiber is interrupted and the
 *   in-flight fetch is aborted.
 */
export const runEffect = async <A, E extends ApiError>(
  effect: Effect.Effect<A, E, AppServices>,
  signal?: AbortSignal,
): Promise<A> => {
  const exit = await runtime.runPromiseExit(effect, { signal });
  if (Exit.isSuccess(exit)) return exit.value;
  const failure = Cause.findErrorOption(exit.cause);
  if (Option.isSome(failure)) throw failure.value;
  // Defects (bugs) and interruptions: rethrow as-is so they surface instead of hiding.
  throw Cause.squash(exit.cause);
};

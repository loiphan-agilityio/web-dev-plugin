import { useMutation, useQueryClient } from '@tanstack/react-query';

import { runEffect } from '@/lib/api/run';
import { clearSession, setSession } from '@/lib/session';

import { login, logout, register } from './api';
import type { Credentials } from './schemas';

// No query keys: auth has no cached reads. Signing in stores the session; ApiClient reads it
// on every request.
export const useLogin = () =>
  useMutation({
    mutationFn: (input: Credentials) => runEffect(login(input)),
    onSuccess: (token, { email }) => {
      setSession({ ...token, email });
    },
  });

/** The API signs the new user in, so a successful register stores a session like login. */
export const useRegister = () =>
  useMutation({
    mutationFn: (input: Credentials) => runEffect(register(input)),
    onSuccess: (token, { email }) => {
      setSession({ ...token, email });
    },
  });

export const useLogout = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => runEffect(logout()),
    // Settled, not success: sign out locally even if the API call failed (offline, or the token
    // was already revoked). Clearing the cache keeps the next user from seeing this one's data.
    onSettled: () => {
      clearSession();
      queryClient.clear();
    },
  });
};

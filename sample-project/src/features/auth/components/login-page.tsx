import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { Schema } from 'effect';
import { Controller, useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { setFormErrors } from '@/lib/forms';

import { useLogin } from '../queries';
import { Credentials, type CredentialsInput } from '../schemas';

// Built once at module level. The explicit type arguments are needed: TypeScript cannot infer
// Input/Output through the intersection type that Schema.toStandardSchemaV1 returns.
const resolver = standardSchemaResolver<CredentialsInput, unknown, Credentials>(
  Schema.toStandardSchemaV1(Credentials),
);

export function LoginPage() {
  const navigate = useNavigate();
  const login = useLogin();
  const form = useForm<CredentialsInput, unknown, Credentials>({
    resolver,
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = form.handleSubmit((values) => {
    login.mutate(values, {
      onSuccess: () => {
        void navigate('/', { replace: true });
      },
      onError: (error) => {
        if (error._tag === 'UnauthorizedError') {
          // toUserMessage would say "session expired", which is wrong while signing in.
          form.setError('root.server', { type: 'server', message: 'Invalid email or password.' });
        } else {
          setFormErrors(form.setError, error);
        }
      },
    });
  });

  const serverError = form.formState.errors.root?.server;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h1>Sign in</h1>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form noValidate onSubmit={(event) => void onSubmit(event)}>
          <FieldGroup>
            <Controller
              name="email"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="login-email">Email</FieldLabel>
                  <Input
                    {...field}
                    id="login-email"
                    type="email"
                    autoComplete="email"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              name="password"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="login-password">Password</FieldLabel>
                  <Input
                    {...field}
                    id="login-password"
                    type="password"
                    autoComplete="current-password"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            {serverError && (
              <Alert variant="destructive">
                <AlertDescription>{serverError.message}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" disabled={login.isPending}>
              {login.isPending ? 'Signing in…' : 'Sign in'}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
      <CardFooter>
        <Link
          to="/register"
          className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
        >
          Create an account
        </Link>
      </CardFooter>
    </Card>
  );
}

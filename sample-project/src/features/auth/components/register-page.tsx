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

import { useRegister } from '../queries';
import { Registration, type RegistrationInput } from '../schemas';

// Built once at module level. The explicit type arguments are needed: TypeScript cannot infer
// Input/Output through the intersection type that Schema.toStandardSchemaV1 returns.
const resolver = standardSchemaResolver<RegistrationInput, unknown, Registration>(
  Schema.toStandardSchemaV1(Registration),
);

export function RegisterPage() {
  const navigate = useNavigate();
  const register = useRegister();
  const form = useForm<RegistrationInput, unknown, Registration>({
    resolver,
    defaultValues: { email: '', password: '', confirmPassword: '' },
  });

  // confirmPassword is only checked here; the API does not take it.
  const onSubmit = form.handleSubmit(({ email, password }) => {
    register.mutate(
      { email, password },
      {
        onSuccess: () => {
          void navigate('/', { replace: true });
        },
        onError: (error) => {
          setFormErrors(form.setError, error);
        },
      },
    );
  });

  const serverError = form.formState.errors.root?.server;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h1>Create an account</h1>
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
                  <FieldLabel htmlFor="register-email">Email</FieldLabel>
                  <Input
                    {...field}
                    id="register-email"
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
                  <FieldLabel htmlFor="register-password">Password</FieldLabel>
                  <Input
                    {...field}
                    id="register-password"
                    type="password"
                    autoComplete="new-password"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              name="confirmPassword"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="register-confirm-password">Confirm password</FieldLabel>
                  <Input
                    {...field}
                    id="register-confirm-password"
                    type="password"
                    autoComplete="new-password"
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
            <Button type="submit" disabled={register.isPending}>
              {register.isPending ? 'Creating account…' : 'Create account'}
            </Button>
          </FieldGroup>
        </form>
      </CardContent>
      <CardFooter>
        <p className="text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link to="/login" className="underline underline-offset-4 hover:text-foreground">
            Sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}

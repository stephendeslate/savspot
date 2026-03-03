import type { Metadata } from 'next';
import { RegisterForm } from '@/components/auth/register-form';

export const metadata: Metadata = {
  title: 'Sign Up - SavSpot',
  description: 'Create your SavSpot account',
};

export default function RegisterPage() {
  return (
    <div>
      <div className="mb-6 text-center">
        <h2 className="text-xl font-semibold">Create an account</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Get started with SavSpot
        </p>
      </div>
      <RegisterForm />
    </div>
  );
}

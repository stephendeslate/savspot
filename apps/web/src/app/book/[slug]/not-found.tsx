import Link from 'next/link';

export default function BookingNotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <h1 className="text-4xl font-bold text-foreground">Business Not Found</h1>
      <p className="mt-4 text-lg text-muted-foreground">
        The business you&apos;re looking for doesn&apos;t exist or is no longer accepting bookings.
      </p>
      <Link
        href="/"
        className="mt-8 rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        Back to Home
      </Link>
    </div>
  );
}

'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Clock,
  Globe,
  Mail,
  MapPin,
  Phone,
  Star,
} from 'lucide-react';
import { Button, Badge, Card, CardContent, CardHeader, CardTitle, Separator, Skeleton } from '@savspot/ui';
import { apiClient } from '@/lib/api-client';

// ---------- Types ----------

interface BusinessProfile {
  slug: string;
  name: string;
  description: string | null;
  category: string;
  address: string | null;
  city: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  averageRating: number | null;
  reviewCount: number;
  services: {
    id: string;
    name: string;
    price: number;
    durationMinutes: number;
  }[];
  gallery: { id: string; url: string; caption: string | null }[];
}

interface BusinessReview {
  id: string;
  authorName: string;
  rating: number;
  comment: string | null;
  createdAt: string;
}

// ---------- Helpers ----------

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (remaining === 0) return `${hours}h`;
  return `${hours}h ${remaining}m`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function renderStars(rating: number) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${
            i < rating
              ? 'fill-yellow-400 text-yellow-400'
              : 'text-gray-300'
          }`}
        />
      ))}
    </div>
  );
}

// ---------- Skeleton ----------

function ProfileSkeleton() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Skeleton className="mb-6 h-8 w-48" />
      <Skeleton className="mb-2 h-6 w-32" />
      <Skeleton className="mb-6 h-4 w-96" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    </div>
  );
}

// ---------- Component ----------

export default function BusinessProfilePage() {
  const params = useParams();
  const slug = params['slug'] as string;

  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [reviews, setReviews] = useState<BusinessReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch profile and reviews
  const fetchProfile = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setNotFound(false);

    try {
      const [profileData, reviewsData] = await Promise.all([
        apiClient.get<BusinessProfile>(
          `/api/directory/businesses/${slug}`,
        ),
        apiClient.get<BusinessReview[]>(
          `/api/directory/businesses/${slug}/reviews`,
        ),
      ]);
      setProfile(profileData);
      setReviews(Array.isArray(reviewsData) ? reviewsData : []);
    } catch (err) {
      if (err instanceof Error && err.message.includes('404')) {
        setNotFound(true);
      } else {
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to load business profile',
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

  // ---------- Loading ----------

  if (isLoading) {
    return <ProfileSkeleton />;
  }

  // ---------- Not Found ----------

  if (notFound) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        <h1 className="mb-2 text-3xl font-bold">Business Not Found</h1>
        <p className="mb-6 text-muted-foreground">
          We could not find a business with the URL &ldquo;{slug}&rdquo;.
        </p>
        <Link href="/directory">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Directory
          </Button>
        </Link>
      </div>
    );
  }

  // ---------- Error ----------

  if (error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        <h1 className="mb-2 text-2xl font-bold">Something went wrong</h1>
        <p className="mb-6 text-muted-foreground">{error}</p>
        <Button onClick={fetchProfile}>Try Again</Button>
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  // ---------- Render ----------

  const location = [profile.address, profile.city, profile.country]
    .filter(Boolean)
    .join(', ');

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Back link */}
      <Link
        href="/directory"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Directory
      </Link>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{profile.name}</h1>
            <div className="mt-1 flex items-center gap-2">
              <Badge variant="secondary">{profile.category}</Badge>
              {profile.averageRating !== null && (
                <div className="flex items-center gap-1 text-sm">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium">
                    {profile.averageRating.toFixed(1)}
                  </span>
                  <span className="text-muted-foreground">
                    ({profile.reviewCount} review
                    {profile.reviewCount !== 1 ? 's' : ''})
                  </span>
                </div>
              )}
            </div>
          </div>
          <Link href={`/book/${profile.slug}`}>
            <Button>Book Now</Button>
          </Link>
        </div>

        {profile.description && (
          <p className="mt-4 text-muted-foreground">{profile.description}</p>
        )}

        {/* Contact Info */}
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
          {location && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              {location}
            </span>
          )}
          {profile.phone && (
            <a
              href={`tel:${profile.phone}`}
              className="inline-flex items-center gap-1.5 hover:text-foreground"
            >
              <Phone className="h-4 w-4" />
              {profile.phone}
            </a>
          )}
          {profile.email && (
            <a
              href={`mailto:${profile.email}`}
              className="inline-flex items-center gap-1.5 hover:text-foreground"
            >
              <Mail className="h-4 w-4" />
              {profile.email}
            </a>
          )}
          {profile.website && (
            <a
              href={profile.website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 hover:text-foreground"
            >
              <Globe className="h-4 w-4" />
              Website
            </a>
          )}
        </div>
      </div>

      <Separator className="my-6" />

      {/* Services */}
      {profile.services.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-4 text-xl font-semibold">Services</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {profile.services.map((service) => (
              <Card key={service.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium">{service.name}</p>
                    <p className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatDuration(service.durationMinutes)}
                    </p>
                  </div>
                  <p className="text-lg font-semibold">
                    ${service.price.toFixed(2)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Gallery */}
      {profile.gallery.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-4 text-xl font-semibold">Gallery</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {profile.gallery.map((image) => (
              <div
                key={image.id}
                className="relative overflow-hidden rounded-lg"
              >
                <div
                  className="h-48 w-full bg-cover bg-center"
                  style={{ backgroundImage: `url(${image.url})` }}
                />
                {image.caption && (
                  <p className="absolute bottom-0 left-0 right-0 bg-black/50 p-2 text-xs text-white">
                    {image.caption}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Reviews */}
      <section className="mb-8">
        <h2 className="mb-4 text-xl font-semibold">
          Reviews
          {reviews.length > 0 && (
            <span className="ml-2 text-base font-normal text-muted-foreground">
              ({reviews.length})
            </span>
          )}
        </h2>
        {reviews.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No reviews yet for this business.
          </p>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <Card key={review.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">
                      {review.authorName}
                    </CardTitle>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(review.createdAt)}
                    </span>
                  </div>
                  {renderStars(review.rating)}
                </CardHeader>
                {review.comment && (
                  <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground">
                      {review.comment}
                    </p>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Book Now CTA */}
      <div className="flex justify-center py-6">
        <Link href={`/book/${profile.slug}`}>
          <Button size="lg">Book Now</Button>
        </Link>
      </div>
    </div>
  );
}

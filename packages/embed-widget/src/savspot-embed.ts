/**
 * SavSpot Embed Widget
 *
 * A self-contained IIFE script that renders a "Book Now" button on third-party sites.
 *
 * Usage:
 *   <script
 *     src="https://cdn.savspot.com/embed/savspot-embed.js"
 *     data-slug="my-business"
 *     data-color="#6366f1"
 *     data-text="Book Now"
 *     data-base-url="https://app.savspot.com"
 *   ></script>
 */

(function () {
  // Find the current script tag to read data attributes
  const scripts = document.querySelectorAll(
    'script[data-slug]',
  ) as NodeListOf<HTMLScriptElement>;
  const currentScript = scripts[scripts.length - 1];

  if (!currentScript) {
    console.error('[SavSpot] Embed script requires a data-slug attribute.');
    return;
  }

  const slug = currentScript.getAttribute('data-slug');
  if (!slug) {
    console.error('[SavSpot] data-slug attribute is required.');
    return;
  }

  const baseUrl = (
    currentScript.getAttribute('data-base-url') || 'https://app.savspot.com'
  ).replace(/\/$/, '');
  const color = currentScript.getAttribute('data-color') || '#6366f1';
  const text = currentScript.getAttribute('data-text') || 'Book Now';

  // Build the booking URL
  const bookingUrl = `${baseUrl}/book/${encodeURIComponent(slug)}`;

  // Create the container
  const container = document.createElement('div');
  container.className = 'savspot-embed-container';

  // Create the link/button
  const link = document.createElement('a');
  link.href = bookingUrl;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = text;
  link.className = 'savspot-book-btn';

  // Apply inline styles so widget works without external CSS
  const styles: Partial<CSSStyleDeclaration> = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '12px 24px',
    fontSize: '15px',
    fontWeight: '600',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    color: '#ffffff',
    backgroundColor: color,
    border: 'none',
    borderRadius: '8px',
    textDecoration: 'none',
    cursor: 'pointer',
    lineHeight: '1',
    transition: 'opacity 0.15s ease, transform 0.15s ease',
    boxShadow: '0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1)',
  };

  Object.assign(link.style, styles);

  // Hover effect
  link.addEventListener('mouseenter', () => {
    link.style.opacity = '0.9';
    link.style.transform = 'translateY(-1px)';
  });
  link.addEventListener('mouseleave', () => {
    link.style.opacity = '1';
    link.style.transform = 'translateY(0)';
  });

  container.appendChild(link);

  // Insert the widget after the script tag
  if (currentScript.parentNode) {
    currentScript.parentNode.insertBefore(
      container,
      currentScript.nextSibling,
    );
  }
})();

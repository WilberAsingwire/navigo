const value = process.env.VITE_API_URL?.trim();

if (!value) {
  console.error(
    'Cannot build NAVIGO for Android: set VITE_API_URL to the hosted NAVIGO backend URL first.'
  );
  process.exit(1);
}

let endpoint;
try {
  endpoint = new URL(value);
} catch {
  console.error('VITE_API_URL must be a complete absolute URL, including https://.');
  process.exit(1);
}

if (endpoint.protocol !== 'https:') {
  console.error('Android release builds require an HTTPS backend URL.');
  process.exit(1);
}

if (!endpoint.hostname || ['localhost', '127.0.0.1', '::1'].includes(endpoint.hostname)) {
  console.error('VITE_API_URL must point to a hosted backend, not localhost.');
  process.exit(1);
}

console.log('Android backend endpoint validated:', endpoint.origin);

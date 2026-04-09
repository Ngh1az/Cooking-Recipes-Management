export function getBaseUrl() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) {
    return appUrl;
  }

  const pageUrl = process.env.PAGE_URL;
  if (pageUrl) {
    return pageUrl;
  }

  const vercelUrl = process.env.VERCEL_URL;
  if (vercelUrl) {
    return `https://${vercelUrl}`;
  }

  return "http://localhost:3000";
}

// TLS for Neon/hosted Postgres; plain for a local database.
export const pgSsl = (url) =>
  /@(localhost|127\.0\.0\.1)|host=\/|\?host=|sslmode=disable/.test(url) ? undefined : { rejectUnauthorized: true };

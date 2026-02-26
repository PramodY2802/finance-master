## Packages
recharts | For dashboard analytics charts and data visualization
date-fns | Human-readable date formatting
jwt-decode | To decode JWT tokens if necessary for expiration checks

## Notes
- The app uses a dark mode professional enterprise UI by default.
- JWT Authentication is implemented via localStorage tokens attached to a custom fetch wrapper (`lib/api.ts`).
- Ensure the backend correctly issues JWTs on `/api/auth/login`.
- If the token is expired, the fetch wrapper will attempt to handle it or redirect to login.

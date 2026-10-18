# CODExLOCK Admin Panel starter (free-tier setup)

Ye starter admin panel + API hai. Isme admin login, 30-day one-time activation keys, list aur revoke API hai. **Ye APK ko modify nahi karta.** APK ko API `/api/activate` se connect karna hoga.

## Zaroori security baat
- Cloudflare account par Worker secrets `ADMIN_USER` aur `ADMIN_PASSWORD` set karein. Password ko code ya APK mein na daalein.
- Admin panel ke liye HTTPS use karein.
- Ye starter key ko ek device ID se bind karta hai; device ID app mein stable aur thoughtfully generated honi chahiye.
- Production launch se pehle rate limiting, stronger admin authentication, abuse controls aur APK integration test karna zaroori hai.
- Admin API currently uses Basic Auth per request; browser session storage mein credentials persist nahi karta, but request memory mein rehte hain while page open.

## Deploy overview (phone browser se)
1. Cloudflare account banayein: https://dash.cloudflare.com/
2. Workers & Pages mein naya D1 database `codexlock-keys` banayein. Migrations mein `migrations/0001_init.sql` run karein.
3. `wrangler.toml` mein D1 `database_id` ko apne actual ID se replace karein.
4. Worker ko deploy karein, aur secrets set karein: `ADMIN_USER`, `ADMIN_PASSWORD`.
5. Public assets ko Worker ke saath deploy karein. Dashboard ka deployment workflow/feature availability account UI mein check karein; alternatively project ko GitHub repo se connect karke deploy karein.
6. `/` par admin panel khulega. Pehle login karke ek test key banayein aur `/api/activate` ko test karein.

## API contract for APK developer
POST `/api/activate` JSON:
`{"key":"CL-ABCDE-FGHIJ-KLMNO-PQRST","deviceId":"stable-device-id"}`
Success: `{"ok":true,"expiresAt":<unix milliseconds>}`
Failure: `{"ok":false,"error":"..."}`

The app must not treat a locally stored boolean as final proof; re-check the API on startup/periodically. The API URL is the deployed Worker URL plus `/api/activate`.

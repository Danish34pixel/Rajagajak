# Rajagajak Backend

Modular JavaScript REST API built with Node.js, Express, and MongoDB/Mongoose.

## Setup

1. Create a backend-root `.env` file and configure `MONGO_URI`, `JWT_SECRET`,
   `IMAGEKIT_PRIVATE_KEY`, `IMAGEKIT_PUBLIC_KEY`, `IMAGEKIT_URL_ENDPOINT`,
   `RAZORPAY_KEY_ID`, and `RAZORPAY_KEY_SECRET`. Configure the store
   coordinates and delivery settings there as well. Verify the store
   coordinates against the shop before enabling live delivery.
2. Install dependencies with `npm install`.
3. Run locally with `npm run dev` or start with `npm start`.

## MongoDB Atlas connection troubleshooting

Set `MONGO_URI` once in the backend root `.env` file. For Atlas, use the
connection string copied from the active cluster's **Connect → Drivers** page;
do not include a second `MONGO_URI=` inside its value. Keep the real database
username and password only in `.env`, and percent-encode special characters in
them. The application loads this file at startup; production deployments may
provide the same variables through the deployment environment.

If startup reports that MongoDB servers cannot be reached:

1. In Atlas, open **Security → Network Access → IP Access List** and add the
   current public IP address of the development machine. For local development
   only, `0.0.0.0/0` temporarily allows connections from any IP; it is not
   recommended for production.
2. Confirm the cluster is active/running. Resume it in Atlas if it is paused.
3. On Windows, test DNS SRV resolution in PowerShell with
   `Resolve-DnsName -Name _mongodb._tcp.<cluster-host> -Type SRV`, replacing
   `<cluster-host>` with the hostname from the Atlas URI. A VPN, firewall,
   antivirus network filter, or restrictive Wi-Fi can also block the connection.
4. After making the Atlas/network change, run `npm run dev` again.

The API is versioned under `/api/v1`. The health endpoint is available at
`GET /api/v1/health`.

Razorpay online checkout fetches the public key from `GET /api/payment/config`
(also available at `/api/v1/payment/config`) before using
`POST /api/v1/payment/create-order` and `POST /api/v1/payment/verify` (also
available at `/api/payment/*` for direct compatibility). The frontend must
only receive the public key ID; the secret remains server-only in the backend
environment.

Upload an image with `POST /api/v1/images` using a multipart form field named
`image`. The file is uploaded to ImageKit under `/rajagajak`, and its URL and
metadata are stored in MongoDB.

## Delivery pricing

Authenticated checkout calls `POST /api/v1/orders/shipping-quote` with either
browser coordinates or a delivery address. The backend uses Google Routes for
driving distance when `GOOGLE_MAPS_API_KEY` is configured, falling back to
Haversine distance if routing is unavailable. Without a key it uses Haversine.
The same backend service recalculates from the submitted delivery address when
an order is created. Browser distance, shipping charges, and totals are never
accepted as pricing; GPS coordinates are validated and distance/charges are
calculated by the backend. New orders snapshot `shipping.distanceKm` and
`shipping.shippingCharge`, so future rate changes do not alter past orders.

Nominatim is the default geocoder and is subject to its public usage policy and
rate limits. For production volume, configure an appropriately licensed,
reliable geocoding provider. For Google, set `GEOCODING_PROVIDER=google` and
keep `GOOGLE_MAPS_API_KEY` only in the backend environment. Shipping defaults
to ₹30 for the first 2 km, then ₹20 per additional 2 km, with a 20 km delivery
limit; these values are configurable with the `SHIPPING_*` and
`MAX_DELIVERY_DISTANCE_KM` variables.

## Coupons

Admin coupon CRUD is under `/api/v1/admin/coupons`; the authenticated customer
preview endpoint is `POST /api/coupons/apply` (also available under
`/api/v1/coupons/apply`). Preview requests include cart items, delivery
address/location, and payment method; the backend reloads product prices,
calculates delivery, and validates the coupon. Orders revalidate and recalculate
the coupon inside a MongoDB transaction, then snapshot coupon, tax, shipping,
and discount values. The transaction also reserves global and per-user usage
and decrements inventory atomically. Coupon order creation therefore requires
a MongoDB replica set; MongoDB Atlas satisfies this requirement, but a local
standalone MongoDB server does not.

Supported coupon types are percentage, fixed amount, free shipping, fixed
shipping, Buy X Get Y, Buy X Get Percentage, and Buy X Get Fixed Amount. Rules
include minimum order/quantity, maximum discount, product/category, eligible
users/first-order/returning-customer, location/radius, payment method, weekday,
date validity, campaign metadata, and usage limits. Referral, loyalty,
birthday, reorder, cart-abandonment, and review-reward eligibility is recorded
as campaign metadata but remains unavailable until those source systems exist.

## Structure

- `src/config`: environment and database configuration.
- `src/controllers`: HTTP request and response handling.
- `src/models`: Mongoose schemas and models.
- `src/routes`: versioned, modular route definitions.
- `src/middleware`: authentication, 404, and error middleware.
- `src/services`: reusable business logic.
- `src/utils`: shared request and response helpers.
- `src/validators`: request validation modules.
- `src/constants`: shared application constants.
- `tests`: automated tests.

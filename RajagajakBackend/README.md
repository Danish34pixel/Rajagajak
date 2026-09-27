# Rajagajak Backend

Modular JavaScript REST API built with Node.js, Express, and MongoDB/Mongoose.

## Setup

1. Copy `.env.example` to `.env` and configure `MONGO_URI`, `JWT_SECRET`,
   `IMAGEKIT_PUBLIC_KEY`, `IMAGEKIT_PRIVATE_KEY`, and `IMAGEKIT_URL_ENDPOINT`.
   Configure the store coordinates and delivery settings there as well. The
   coordinates in `.env.example` are the Photon/OpenStreetMap geocoder result
   for Moti Masjid, Bhopal (postcode 462001), not a rooftop-level match for
   Shop No. 27; verify them against the shop before enabling live delivery.
2. Install dependencies with `npm install`.
3. Run locally with `npm run dev` or start with `npm start`.

The API is versioned under `/api/v1`. The health endpoint is available at
`GET /api/v1/health`.

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

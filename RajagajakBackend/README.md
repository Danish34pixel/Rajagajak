# Rajagajak Backend

Modular JavaScript REST API built with Node.js, Express, and MongoDB/Mongoose.

## Setup

1. Copy `.env.example` to `.env` and configure `MONGO_URI`, `JWT_SECRET`,
   `IMAGEKIT_PUBLIC_KEY`, `IMAGEKIT_PRIVATE_KEY`, and `IMAGEKIT_URL_ENDPOINT`.
2. Install dependencies with `npm install`.
3. Run locally with `npm run dev` or start with `npm start`.

The API is versioned under `/api/v1`. The health endpoint is available at
`GET /api/v1/health`.

Upload an image with `POST /api/v1/images` using a multipart form field named
`image`. The file is uploaded to ImageKit under `/rajagajak`, and its URL and
metadata are stored in MongoDB.

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

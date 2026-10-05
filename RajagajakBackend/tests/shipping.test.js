process.env.MONGO_URI ||= "mongodb://localhost/rajagajak-test";
process.env.JWT_SECRET ||= "test-jwt-secret";
process.env.IMAGEKIT_PRIVATE_KEY ||= "private_test_key";
process.env.GEOCODING_PROVIDER = "nominatim";
process.env.GOOGLE_MAPS_API_KEY = "";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  assertWithinDeliveryDistance,
  calculateHaversineDistance,
  calculateShippingCharge,
  DELIVERY_AREA_ERROR,
  calculateDelivery,
} = require("../src/services/shipping.service");
const env = require("../src/config/env");

test("shipping tiers include exact two-kilometer boundaries", () => {
  const cases = [
    [1, 30],
    [2, 30],
    [2.1, 50],
    [4, 50],
    [4.1, 70],
    [6, 70],
    [6.1, 90],
  ];
  for (const [distance, charge] of cases)
    assert.equal(calculateShippingCharge(distance), charge);
});

test("shipping tiers continue using configured increments", () => {
  assert.equal(
    calculateShippingCharge(8.1, {
      baseDistanceKm: 2,
      baseCharge: 30,
      additionalDistanceKm: 2,
      additionalCharge: 30,
    }),
    150,
  );
});

test("Haversine distance is zero for the same coordinates", () => {
  const point = { latitude: 23.2556174, longitude: 77.3994281 };
  assert.equal(calculateHaversineDistance(point, point), 0);
});

test("GPS shipping uses customer coordinates and returns a readable address", async () => {
  const originalFetch = global.fetch;
  const customerLocation = { latitude: 23.2599, longitude: 77.4126 };
  global.fetch = async (url) => {
    const requestedUrl = new URL(url);
    assert.equal(requestedUrl.pathname, "/reverse");
    assert.equal(requestedUrl.searchParams.get("lat"), "23.2599");
    assert.equal(requestedUrl.searchParams.get("lon"), "77.4126");
    return {
      ok: true,
      json: async () => ({
        address: {
          house_number: "27",
          road: "Moti Masjid Road",
          neighbourhood: "Peer Gate",
          suburb: "Old Bhopal",
          city: "Bhopal",
          state: "Madhya Pradesh",
          postcode: "462001",
          country: "India",
        },
      }),
    };
  };

  try {
    const result = await calculateDelivery({ customerLocation });
    assert.deepEqual(result.destination, customerLocation);
    assert.equal(result.location.houseNumber, "27");
    assert.equal(result.location.road, "Moti Masjid Road");
    assert.equal(result.location.city, "Bhopal");
    assert.equal(result.location.state, "Madhya Pradesh");
    assert.equal(result.location.pincode, "462001");
    assert.equal(
      result.fullAddress,
      "27, Moti Masjid Road, Peer Gate, Old Bhopal, Bhopal, Madhya Pradesh - 462001, India",
    );
    assert.equal(result.locationDetected, true);
    assert.equal(
      result.distanceKm,
      Number(
        calculateHaversineDistance(env.storeLocation, customerLocation).toFixed(
          3,
        ),
      ),
    );
  } finally {
    global.fetch = originalFetch;
  }
});

test("GPS shipping fails when reverse geocoding cannot provide a complete address", async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    json: async () => ({ address: {} }),
  });

  try {
    await assert.rejects(
      calculateDelivery({
        customerLocation: { latitude: 23.2599, longitude: 77.4126 },
      }),
      {
        message:
          "We couldn't get a readable address for your current location.",
      },
    );
  } finally {
    global.fetch = originalFetch;
  }
});

test("maximum delivery distance allows the boundary and rejects farther locations", () => {
  assert.doesNotThrow(() => assertWithinDeliveryDistance(20, 20));
  assert.throws(() => assertWithinDeliveryDistance(20.001, 20), {
    message: DELIVERY_AREA_ERROR,
  });
});

test("manual address geocodes structured house, area, and city fields", async () => {
  const originalFetch = global.fetch;
  let requestedUrl;
  global.fetch = async (url) => {
    requestedUrl = new URL(url);
    return {
      ok: true,
      json: async () => [
        {
          lat: String(env.storeLocation.latitude),
          lon: String(env.storeLocation.longitude),
        },
      ],
    };
  };

  try {
    const result = await calculateDelivery({
      shippingAddress: {
        address: "24 MG Road",
        area: "Vijay Nagar",
        city: "Indore",
        state: "Madhya Pradesh",
        pincode: "452010",
      },
    });
    assert.match(
      requestedUrl.searchParams.get("q"),
      /24 MG Road, Vijay Nagar, Indore, Madhya Pradesh, 452010/,
    );
    assert.deepEqual(result.destination, {
      latitude: env.storeLocation.latitude,
      longitude: env.storeLocation.longitude,
    });
    assert.equal(result.shippingCharge, 30);
  } finally {
    global.fetch = originalFetch;
  }
});

test("manual address geocoding reports an unresolvable address", async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => ({ ok: true, json: async () => [] });

  try {
    await assert.rejects(
      calculateDelivery({
        shippingAddress: {
          address: "Unknown House",
          area: "Unknown Area",
          city: "Indore",
          state: "Madhya Pradesh",
          pincode: "452010",
        },
      }),
      { message: "We couldn't find that delivery address." },
    );
  } finally {
    global.fetch = originalFetch;
  }
});

test("manual address falls back only to an exact matching postcode feature", async () => {
  const originalFetch = global.fetch;
  const requestedUrls = [];
  global.fetch = async (url) => {
    const requestedUrl = new URL(url);
    requestedUrls.push(requestedUrl);
    if (requestedUrl.hostname === "nominatim.openstreetmap.org")
      return { ok: true, json: async () => [] };
    return {
      ok: true,
      json: async () => ({
        features: [
          {
            properties: {
              osm_key: "place",
              osm_value: "postcode",
              name: "462001",
              district: "Bhopal",
              state: "Madhya Pradesh",
              countrycode: "IN",
            },
            geometry: { coordinates: [77.3838153, 23.2526793] },
          },
          {
            properties: {
              osm_key: "amenity",
              name: "Unrelated POI",
              city: "Bhopal",
              postcode: "462001",
              countrycode: "IN",
            },
            geometry: { coordinates: [77.399, 23.255] },
          },
        ],
      }),
    };
  };

  try {
    const result = await calculateDelivery({
      shippingAddress: {
        address: "72",
        area: "PGBT collage road",
        city: "Bhopal",
        state: "mp",
        pincode: "462001",
      },
    });
    assert.equal(
      requestedUrls[0].searchParams.get("q"),
      "72, PGBT collage road, Bhopal, Madhya Pradesh, 462001",
    );
    assert.equal(result.geocodingPrecision, "postcode");
    assert.deepEqual(result.destination, {
      latitude: 23.2526793,
      longitude: 77.3838153,
    });
  } finally {
    global.fetch = originalFetch;
  }
});

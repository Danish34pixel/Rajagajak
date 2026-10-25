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
  calculateEstimatedShipping,
  DELIVERY_AREA_ERROR,
  calculateDelivery,
} = require("../src/services/shipping.service");
const env = require("../src/config/env");

const postOfficeResponse = (pincode, state, district) => [
  {
    Status: "Success",
    PostOffice: [{ Pincode: pincode, State: state, District: district }],
  },
];

const postalFetch = (postOffice, addressResult) => async (url) => {
  const requestedUrl = new URL(url);
  if (requestedUrl.hostname === "api.postalpincode.in")
    return {
      ok: true,
      json: async () => postOffice,
    };
  if (requestedUrl.hostname === "nominatim.openstreetmap.org")
    return {
      ok: true,
      json: async () => addressResult,
    };
  throw new Error(`Unexpected provider request: ${requestedUrl}`);
};

test("Bhopal shipping tiers include exact two-kilometer boundaries", () => {
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

test("Bhopal configured increments remain independently adjustable", () => {
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

test("Haversine distance is zero for identical coordinates", () => {
  const point = { latitude: 23.2556174, longitude: 77.3994281 };
  assert.equal(calculateHaversineDistance(point, point), 0);
});

test("existing Bhopal manual address uses the unchanged local rate", async () => {
  const originalFetch = global.fetch;
  global.fetch = postalFetch(
    postOfficeResponse("462001", "Madhya Pradesh", "Bhopal"),
    [
      {
        lat: String(env.storeLocation.latitude),
        lon: String(env.storeLocation.longitude),
        address: {
          city: "Bhopal",
          state: "Madhya Pradesh",
          postcode: "462001",
        },
      },
    ],
  );

  try {
    const result = await calculateDelivery({
      shippingAddress: {
        address: "24 Moti Masjid Road",
        area: "Peer Gate",
        city: "Bhopal",
        state: "Madhya Pradesh",
        pincode: "462001",
      },
      items: [{ quantityKg: 1 }],
    });
    assert.equal(result.shippingMethod, "local");
    assert.equal(result.shippingCharge, 30);
    assert.equal(result.estimated, false);
  } finally {
    global.fetch = originalFetch;
  }
});

test("GPS Bhopal quote reverse-geocodes and retains existing local pricing", async () => {
  const originalFetch = global.fetch;
  const customerLocation = { latitude: 23.2599, longitude: 77.4126 };
  global.fetch = async (url) => {
    const requestedUrl = new URL(url);
    if (requestedUrl.hostname === "api.postalpincode.in")
      return {
        ok: true,
        json: async () =>
          postOfficeResponse("462001", "Madhya Pradesh", "Bhopal"),
      };
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
    assert.equal(result.location.city, "Bhopal");
    assert.equal(result.location.pincode, "462001");
    assert.equal(result.shippingMethod, "local");
    assert.equal(result.shippingCharge, 30);
  } finally {
    global.fetch = originalFetch;
  }
});

test("invalid pincodes are rejected before address geocoding", async () => {
  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    json: async () => [{ Status: "Error", PostOffice: null }],
  });
  try {
    await assert.rejects(
      calculateDelivery({
        shippingAddress: {
          address: "Unknown House",
          city: "Indore",
          state: "Madhya Pradesh",
          pincode: "000000",
        },
        items: [{ quantityKg: 1 }],
      }),
      { message: "Please enter a valid serviceable Indian pincode." },
    );
  } finally {
    global.fetch = originalFetch;
  }
});

test("Indore destination uses the configured local-state estimate", async () => {
  const originalFetch = global.fetch;
  global.fetch = postalFetch(
    postOfficeResponse("452010", "Madhya Pradesh", "Indore"),
    [
      {
        lat: "22.7196",
        lon: "75.8577",
        address: {
          city: "Indore",
          state: "Madhya Pradesh",
          postcode: "452010",
        },
      },
    ],
  );
  try {
    const result = await calculateDelivery({
      shippingAddress: {
        address: "56 Vijay Nagar",
        city: "Indore",
        state: "Madhya Pradesh",
        pincode: "452010",
      },
      items: [{ quantityKg: 1 }],
    });
    assert.equal(result.shippingMethod, "estimated");
    assert.equal(result.shippingZone, "local");
    assert.equal(result.estimated, true);
    assert.equal(result.shippingCharge, 145);
    assert.equal(result.shipmentWeightKg, 1.25);
    assert.equal(result.location.pincode, "452010");
  } finally {
    global.fetch = originalFetch;
  }
});

test("other states receive a clearly identified nearby or distant estimate", async () => {
  const originalFetch = global.fetch;
  global.fetch = postalFetch(
    postOfficeResponse("110001", "Delhi", "New Delhi"),
    [
      {
        lat: "28.6139",
        lon: "77.2090",
        address: {
          city: "New Delhi",
          state: "Delhi",
          postcode: "110001",
        },
      },
    ],
  );
  try {
    const result = await calculateDelivery({
      shippingAddress: {
        address: "12 Example Road",
        area: "Connaught Place",
        city: "New Delhi",
        state: "Delhi",
        pincode: "110001",
      },
      items: [{ quantityKg: 1 }],
    });
    assert.equal(result.shippingMethod, "estimated");
    assert.equal(result.shippingZone, "distant-state");
    assert.equal(result.estimated, true);
    assert.equal(result.shippingCharge, 305);
  } finally {
    global.fetch = originalFetch;
  }
});

test("nearby-state destinations use nearby-state rates", () => {
  const result = calculateEstimatedShipping({
    weightKg: 1,
    state: "Rajasthan",
  });
  assert.equal(result.shippingZone, "nearby-state");
  assert.equal(result.shippingCharge, 215);
});

test("reliable road distance can override state-only zone classification", () => {
  assert.equal(
    calculateEstimatedShipping({
      weightKg: 1,
      state: "Delhi",
      distanceKm: 200,
      distanceMethod: "road",
    }).shippingZone,
    "local",
  );
  assert.equal(
    calculateEstimatedShipping({
      weightKg: 1,
      state: "Madhya Pradesh",
      distanceKm: 500,
      distanceMethod: "road",
    }).shippingZone,
    "nearby-state",
  );
  assert.equal(
    calculateEstimatedShipping({
      weightKg: 1,
      state: "Rajasthan",
      distanceKm: 1200,
      distanceMethod: "road",
    }).shippingZone,
    "distant-state",
  );
});

test("weight slab calculation includes packaging and minimum charge", () => {
  const rates = {
    packagingWeightKg: 0.25,
    weightSlabKg: 0.5,
    baseWeightKg: 0.5,
    zones: {
      local: {
        states: ["Madhya Pradesh"],
        baseCharge: 85,
        additionalChargePerSlab: 30,
        minimumCharge: 120,
      },
      "nearby-state": {
        states: [],
        baseCharge: 125,
        additionalChargePerSlab: 45,
        minimumCharge: 125,
      },
      "distant-state": {
        states: [],
        baseCharge: 175,
        additionalChargePerSlab: 65,
        minimumCharge: 175,
      },
    },
  };
  assert.deepEqual(
    calculateEstimatedShipping(
      { weightKg: 0.3, state: "Madhya Pradesh" },
      rates,
    ),
    {
      shippingCharge: 120,
      shippingZone: "local",
      shipmentWeightKg: 0.55,
      chargeableWeightKg: 1,
      estimated: true,
    },
  );
});

test("custom 15 kg, 25 kg, and 50 kg carts calculate increasing estimates", () => {
  const charges = [15, 25, 50].map(
    (weightKg) =>
      calculateEstimatedShipping({
        weightKg,
        state: "Delhi",
      }).shippingCharge,
  );
  assert.deepEqual(charges, [2125, 3425, 6675]);
});

test("validated cart weights and quantities determine shipment weight", () => {
  const oneProduct = calculateEstimatedShipping({
    weightKg: 1,
    state: "Delhi",
  });
  const multipleProducts = calculateEstimatedShipping({
    weightKg: 1.5 + 2,
    state: "Delhi",
  });
  assert.equal(oneProduct.shipmentWeightKg, 1.25);
  assert.equal(multipleProducts.shipmentWeightKg, 3.75);
  assert.ok(multipleProducts.shippingCharge > oneProduct.shippingCharge);
});

test("unsupported or missing destination regions and invalid weights fail clearly", () => {
  assert.throws(
    () =>
      calculateEstimatedShipping({
        weightKg: 1,
        state: "",
      }),
    {
      message: "The delivery pincode does not have supported region data.",
    },
  );
  assert.throws(
    () =>
      calculateEstimatedShipping({
        weightKg: Number.NaN,
        state: "Delhi",
      }),
    { message: "Estimated shipping weight settings are invalid." },
  );
});

test("a Bhopal address without reliable location coordinates is not misclassified", async () => {
  const originalFetch = global.fetch;
  global.fetch = postalFetch(
    postOfficeResponse("462001", "Madhya Pradesh", "Bhopal"),
    [],
  );
  try {
    await assert.rejects(
      calculateDelivery({
        shippingAddress: {
          address: "24 Moti Masjid Road",
          city: "Bhopal",
          state: "Madhya Pradesh",
          pincode: "462001",
        },
        items: [{ quantityKg: 1 }],
      }),
      {
        message:
          "We couldn't confirm the Bhopal delivery distance. Please try again or enter a more complete address.",
      },
    );
  } finally {
    global.fetch = originalFetch;
  }
});

test("maximum local delivery distance allows the boundary and rejects farther addresses", () => {
  assert.doesNotThrow(() => assertWithinDeliveryDistance(20, 20));
  assert.throws(() => assertWithinDeliveryDistance(20.001, 20), {
    message: DELIVERY_AREA_ERROR,
  });
});

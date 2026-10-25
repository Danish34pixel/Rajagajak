const env = require("../config/env");

const DELIVERY_AREA_ERROR =
  "Sorry, we currently deliver only within our delivery area.";
const INVALID_PINCODE_ERROR = "Please enter a valid serviceable Indian pincode.";
const indianPostCache = new Map();

const validateCoordinates = (coordinates) => {
  const latitude = Number(coordinates?.latitude);
  const longitude = Number(coordinates?.longitude);
  if (
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > 90 ||
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 180
  )
    throw new Error("A valid delivery location is required.");
  return { latitude, longitude };
};

const calculateHaversineDistance = (origin, destination) => {
  const earthRadiusKm = 6371.0088;
  const radians = (degrees) => (degrees * Math.PI) / 180;
  const latitudeDifference = radians(destination.latitude - origin.latitude);
  const longitudeDifference = radians(destination.longitude - origin.longitude);
  const value =
    Math.sin(latitudeDifference / 2) ** 2 +
    Math.cos(radians(origin.latitude)) *
      Math.cos(radians(destination.latitude)) *
      Math.sin(longitudeDifference / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
};

const calculateShippingCharge = (distanceKm, rates = env.shippingRates) => {
  if (!Number.isFinite(distanceKm) || distanceKm < 0)
    throw new Error("Unable to calculate delivery distance.");
  const { baseDistanceKm, baseCharge, additionalDistanceKm, additionalCharge } =
    rates;
  if (
    !Number.isFinite(baseDistanceKm) ||
    baseDistanceKm <= 0 ||
    !Number.isFinite(baseCharge) ||
    baseCharge < 0 ||
    !Number.isFinite(additionalDistanceKm) ||
    additionalDistanceKm <= 0 ||
    !Number.isFinite(additionalCharge) ||
    additionalCharge < 0
  )
    throw new Error("Shipping rates are not configured correctly.");
  if (distanceKm <= baseDistanceKm) return baseCharge;
  const additionalBands = Math.ceil(
    (distanceKm - baseDistanceKm) / additionalDistanceKm,
  );
  return baseCharge + Math.max(1, additionalBands) * additionalCharge;
};

const assertWithinDeliveryDistance = (
  distanceKm,
  maximumDistanceKm = env.shippingRates.maximumDistanceKm,
) => {
  if (!Number.isFinite(maximumDistanceKm) || maximumDistanceKm <= 0)
    throw new Error(
      "The maximum delivery distance is not configured correctly.",
    );
  if (distanceKm > maximumDistanceKm) throw new Error(DELIVERY_AREA_ERROR);
};

const requestJson = async (url, options = {}) => {
  const response = await fetch(url, {
    ...options,
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok)
    throw new Error(`Location provider returned ${response.status}.`);
  return response.json();
};

const requestExternalJson = async (url, options = {}) => {
  const response = await fetch(url, {
    ...options,
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok)
    throw Object.assign(new Error("An external delivery provider failed."), {
      statusCode: 502,
    });
  return response.json();
};

const getIndianPostOffice = async (pincode) => {
  if (!/^\d{6}$/.test(String(pincode || "")))
    throw Object.assign(new Error(INVALID_PINCODE_ERROR), { statusCode: 400 });
  const cached = indianPostCache.get(pincode);
  if (cached && cached.expiresAt > Date.now()) return cached.office;
  let result;
  try {
    result = await requestExternalJson(
      `https://api.postalpincode.in/pincode/${encodeURIComponent(pincode)}`,
    );
  } catch (error) {
    if (error.statusCode) throw error;
    throw Object.assign(
      new Error("Pincode validation is temporarily unavailable."),
      { statusCode: 502 },
    );
  }
  const offices = result?.[0]?.Status === "Success" &&
    Array.isArray(result[0].PostOffice)
    ? result[0].PostOffice.filter(
        (office) => String(office?.Pincode || "") === pincode,
      )
    : [];
  if (!offices.length)
    throw Object.assign(new Error(INVALID_PINCODE_ERROR), { statusCode: 400 });
  if (indianPostCache.size >= 1000) {
    const now = Date.now();
    for (const [key, entry] of indianPostCache) {
      if (entry.expiresAt <= now) indianPostCache.delete(key);
    }
    if (indianPostCache.size >= 1000)
      indianPostCache.delete(indianPostCache.keys().next().value);
  }
  indianPostCache.set(pincode, {
    office: offices[0],
    expiresAt: Date.now() + 24 * 60 * 60 * 1000,
  });
  return offices[0];
};

const normalizeState = (state = "") => {
  const normalized = String(state).trim();
  const stateNames = {
    mp: "Madhya Pradesh",
    up: "Uttar Pradesh",
    mh: "Maharashtra",
    dl: "Delhi",
    rj: "Rajasthan",
    gj: "Gujarat",
    br: "Bihar",
    wb: "West Bengal",
    tn: "Tamil Nadu",
    ka: "Karnataka",
    kl: "Kerala",
    ts: "Telangana",
    ap: "Andhra Pradesh",
    od: "Odisha",
    pb: "Punjab",
    hr: "Haryana",
    uk: "Uttarakhand",
    hp: "Himachal Pradesh",
    as: "Assam",
    jh: "Jharkhand",
    cg: "Chhattisgarh",
    go: "Goa",
    "nct of delhi": "Delhi",
    orissa: "Odisha",
    pondicherry: "Puducherry",
    uttaranchal: "Uttarakhand",
    "jammu & kashmir": "Jammu and Kashmir",
    "dadra and nagar haveli": "Dadra and Nagar Haveli and Daman and Diu",
    "daman and diu": "Dadra and Nagar Haveli and Daman and Diu",
  };
  return stateNames[normalized.toLowerCase()] || normalized;
};

const supportedIndianRegions = new Set([
  "andaman and nicobar islands",
  "andhra pradesh",
  "arunachal pradesh",
  "assam",
  "bihar",
  "chandigarh",
  "chhattisgarh",
  "dadra and nagar haveli",
  "dadra and nagar haveli and daman and diu",
  "daman and diu",
  "delhi",
  "goa",
  "gujarat",
  "haryana",
  "himachal pradesh",
  "jammu and kashmir",
  "jharkhand",
  "karnataka",
  "kerala",
  "ladakh",
  "lakshadweep",
  "madhya pradesh",
  "maharashtra",
  "manipur",
  "meghalaya",
  "mizoram",
  "nagaland",
  "odisha",
  "puducherry",
  "punjab",
  "rajasthan",
  "sikkim",
  "tamil nadu",
  "telangana",
  "tripura",
  "uttar pradesh",
  "uttarakhand",
  "west bengal",
]);

const getShippingZone = (
  state,
  { distanceKm, distanceMethod } = {},
  rates = env.shippingEstimateRates,
) => {
  if (!rates?.zones || typeof rates.zones !== "object")
    throw new Error("Estimated shipping rates are not configured correctly.");
  if (!supportedIndianRegions.has(normalizeState(state).toLowerCase()))
    throw new Error("The delivery pincode does not have supported region data.");

  const thresholds = rates.distanceThresholdsKm;
  if (distanceMethod === "road" && Number.isFinite(distanceKm)) {
    if (
      !Number.isFinite(thresholds?.localMax) ||
      !Number.isFinite(thresholds?.nearbyMax) ||
      thresholds.localMax < 0 ||
      thresholds.nearbyMax < thresholds.localMax
    )
      throw new Error("Estimated shipping distance settings are invalid.");
    if (distanceKm <= thresholds.localMax) return "local";
    if (distanceKm <= thresholds.nearbyMax) return "nearby-state";
    return "distant-state";
  }

  const normalizedState = normalizeState(state).toLowerCase();
  for (const [zone, configuration] of Object.entries(rates.zones)) {
    if (!Array.isArray(configuration?.states))
      throw new Error("Estimated shipping rates are not configured correctly.");
    if (configuration.states.some(
      (configuredState) =>
        normalizeState(configuredState).toLowerCase() === normalizedState,
    ))
      return zone;
  }
  return "distant-state";
};

const calculateEstimatedShipping = (
  { weightKg, state, distanceKm, distanceMethod },
  rates = env.shippingEstimateRates,
) => {
  const { packagingWeightKg, baseWeightKg, weightSlabKg, zones } = rates;
  if (
    !Number.isFinite(weightKg) ||
    weightKg <= 0 ||
    !Number.isFinite(packagingWeightKg) ||
    packagingWeightKg < 0 ||
    !Number.isFinite(baseWeightKg) ||
    baseWeightKg <= 0 ||
    !Number.isFinite(weightSlabKg) ||
    weightSlabKg <= 0
  )
    throw new Error("Estimated shipping weight settings are invalid.");

  const zone = getShippingZone(
    state,
    { distanceKm, distanceMethod },
    rates,
  );
  const zoneRates = zones[zone];
  if (
    !zoneRates ||
    !Number.isFinite(zoneRates.baseCharge) ||
    zoneRates.baseCharge <= 0 ||
    !Number.isFinite(zoneRates.additionalChargePerSlab) ||
    zoneRates.additionalChargePerSlab < 0 ||
    !Number.isFinite(zoneRates.minimumCharge) ||
    zoneRates.minimumCharge <= 0
  )
    throw new Error("Estimated shipping rates are not configured correctly.");

  const shipmentWeightKg = weightKg + packagingWeightKg;
  const additionalSlabs = Math.max(
    0,
    Math.ceil((shipmentWeightKg - baseWeightKg) / weightSlabKg),
  );
  const chargeableWeightKg = Number(
    (baseWeightKg + additionalSlabs * weightSlabKg).toFixed(3),
  );
  const shippingCharge = Math.max(
    zoneRates.minimumCharge,
    zoneRates.baseCharge +
      additionalSlabs * zoneRates.additionalChargePerSlab,
  );
  return {
    shippingCharge,
    shippingZone: zone,
    shipmentWeightKg: Number(shipmentWeightKg.toFixed(3)),
    chargeableWeightKg,
    estimated: true,
  };
};

const addressQuery = (address = {}) =>
  [
    address.houseShop,
    address.address,
    address.area,
    address.city,
    normalizeState(address.state),
    address.pincode,
  ]
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .join(", ");

const locationParts = ({
  building = "",
  houseNumber = "",
  road = "",
  locality = "",
  area = "",
  district = "",
  city = "",
  state = "",
  pincode = "",
  country = "",
} = {}) => {
  const parts = {
    building: String(building).trim(),
    houseNumber: String(houseNumber).trim(),
    road: String(road).trim(),
    locality: String(locality).trim(),
    area: String(area).trim(),
    district: String(district).trim(),
    city: String(city).trim(),
    state: normalizeState(state),
    pincode: String(pincode).trim(),
    country: String(country).trim(),
  };
  const unique = (values) =>
    values.filter(
      (value, index) =>
        value &&
        values.findIndex(
          (candidate) => candidate.toLowerCase() === value.toLowerCase(),
        ) === index,
    );
  const street = unique([parts.building, parts.houseNumber, parts.road]);
  const addressLines = unique([
    ...street,
    parts.locality,
    parts.area,
    parts.city,
    parts.district,
    [parts.state, parts.pincode].filter(Boolean).join(" - "),
    parts.country,
  ]);
  return { ...parts, fullAddress: addressLines.join(", ") };
};

const googleLocationParts = (components = []) => {
  const component = (...types) =>
    components.find((item) => types.some((type) => item.types?.includes(type)))
      ?.long_name || "";
  return locationParts({
    building: component("premise", "subpremise"),
    houseNumber: component("street_number"),
    road: component("route"),
    locality: component("neighborhood", "sublocality_level_1", "sublocality"),
    area: component("sublocality_level_2", "sublocality_level_3"),
    district: component("administrative_area_level_2"),
    city:
      component("locality") ||
      component("postal_town") ||
      component("administrative_area_level_2"),
    state: component("administrative_area_level_1"),
    pincode: component("postal_code"),
    country: component("country"),
  });
};

const geocodeAddress = async (address) => {
  const query = addressQuery(address);
  if (!query) throw new Error("A complete delivery address is required.");

  if (env.geocodingProvider === "google") {
    if (!env.googleMapsApiKey)
      throw new Error(
        "Google geocoding is enabled but its API key is missing.",
      );
    const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
    url.searchParams.set("address", query);
    url.searchParams.set("key", env.googleMapsApiKey);
    const result = await requestJson(url);
    if (result.status !== "OK" || !result.results?.[0])
      throw new Error("We couldn't find that delivery address.");
    return {
      ...validateCoordinates(result.results[0].geometry.location),
      geocodingPrecision: "address",
      resolvedAddress: googleLocationParts(
        result.results[0].address_components,
      ),
    };
  }

  if (env.geocodingProvider !== "nominatim")
    throw new Error("The configured geocoding provider is not supported.");
  const url = new URL(`${env.nominatimBaseUrl}/search`);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "1");
  try {
    const result = await requestJson(url, {
      headers: { "User-Agent": env.geocodingUserAgent },
    });
    if (result?.[0])
      return {
        ...validateCoordinates({
          latitude: result[0].lat,
          longitude: result[0].lon,
        }),
        geocodingPrecision: "address",
        resolvedAddress: locationParts({
          city:
            result[0].address?.city ||
            result[0].address?.town ||
            result[0].address?.village ||
            result[0].address?.municipality ||
            result[0].address?.county,
          state: result[0].address?.state,
          pincode: result[0].address?.postcode,
        }),
      };
  } catch {
    // Try the postcode boundary when street lookup fails.
  }

  const pincode = String(address.pincode || "").trim();
  const city = String(address.city || "").trim();
  if (!/^\d{6}$/.test(pincode) || !city)
    throw new Error("We couldn't find that delivery address.");

  const postcodeUrl = new URL("https://photon.komoot.io/api/");
  postcodeUrl.searchParams.set("q", pincode);
  postcodeUrl.searchParams.set("limit", "10");
  const postcodeResult = await requestJson(postcodeUrl);
  const fold = (value) =>
    String(value || "")
      .trim()
      .toLowerCase();
  const postcodeFeature = postcodeResult.features?.find((feature) => {
    const properties = feature.properties || {};
    const featureCities = [
      properties.city,
      properties.district,
      properties.county,
    ].map(fold);
    return (
      properties.osm_key === "place" &&
      properties.osm_value === "postcode" &&
      String(properties.name || "") === pincode &&
      String(properties.countrycode || "").toUpperCase() === "IN" &&
      featureCities.includes(fold(city)) &&
      (!properties.state ||
        fold(properties.state) === fold(normalizeState(address.state)))
    );
  });
  const coordinates = postcodeFeature?.geometry?.coordinates;
  if (!Array.isArray(coordinates) || coordinates.length < 2)
    throw new Error("We couldn't find that delivery address.");
  return {
    ...validateCoordinates({
      latitude: coordinates[1],
      longitude: coordinates[0],
    }),
    geocodingPrecision: "postcode",
    resolvedAddress: locationParts({
      city:
        postcodeFeature.properties.city || postcodeFeature.properties.district,
      state: postcodeFeature.properties.state,
      pincode: postcodeFeature.properties.name,
    }),
  };
};

const reverseGeocode = async (coordinates) => {
  if (env.geocodingProvider === "google" && env.googleMapsApiKey) {
    const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
    url.searchParams.set(
      "latlng",
      `${coordinates.latitude},${coordinates.longitude}`,
    );
    url.searchParams.set("key", env.googleMapsApiKey);
    const result = await requestJson(url);
    if (result.status !== "OK" || !result.results?.[0])
      throw new Error(
        "We couldn't get a readable address for your current location.",
      );
    const address = googleLocationParts(result.results[0].address_components);
    if (
      !address.fullAddress ||
      !address.state ||
      !(address.city || address.district)
    )
      throw new Error(
        "We couldn't get a readable address for your current location.",
      );
    return address;
  }
  if (env.geocodingProvider !== "nominatim")
    throw new Error(
      "We couldn't get a readable address for your current location.",
    );
  const url = new URL(`${env.nominatimBaseUrl}/reverse`);
  url.searchParams.set("lat", String(coordinates.latitude));
  url.searchParams.set("lon", String(coordinates.longitude));
  url.searchParams.set("format", "jsonv2");
  const result = await requestJson(url, {
    headers: { "User-Agent": env.geocodingUserAgent },
  });
  if (!result?.address)
    throw new Error(
      "We couldn't get a readable address for your current location.",
    );
  const address = locationParts({
    building: result.address.building,
    houseNumber: result.address.house_number,
    road: result.address.road,
    locality: result.address.neighbourhood || result.address.hamlet,
    area: result.address.suburb || result.address.city_district,
    district: result.address.county,
    city:
      result.address.city ||
      result.address.town ||
      result.address.village ||
      result.address.municipality,
    state: result.address.state,
    pincode: result.address.postcode,
    country: result.address.country,
  });
  if (
    !address.fullAddress ||
    !address.state ||
    !(address.city || address.district)
  )
    throw new Error(
      "We couldn't get a readable address for your current location.",
    );
  return address;
};

const getRoadDistanceKm = async (origin, destination) => {
  if (!env.googleMapsApiKey)
    return {
      distanceKm: calculateHaversineDistance(origin, destination),
      method: "haversine",
    };

  try {
    const result = await requestJson(
      "https://routes.googleapis.com/directions/v2:computeRoutes",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": env.googleMapsApiKey,
          "X-Goog-FieldMask": "routes.distanceMeters",
        },
        body: JSON.stringify({
          origin: {
            location: {
              latLng: {
                latitude: origin.latitude,
                longitude: origin.longitude,
              },
            },
          },
          destination: {
            location: {
              latLng: {
                latitude: destination.latitude,
                longitude: destination.longitude,
              },
            },
          },
          travelMode: "DRIVE",
          routingPreference: "TRAFFIC_UNAWARE",
          units: "METRIC",
        }),
      },
    );
    const meters = Number(result.routes?.[0]?.distanceMeters);
    if (!Number.isFinite(meters) || meters < 0)
      throw new Error("The routing provider returned no route.");
    return { distanceKm: meters / 1000, method: "road" };
  } catch {
    return {
      distanceKm: calculateHaversineDistance(origin, destination),
      method: "haversine",
    };
  }
};

const calculateDelivery = async ({
  customerLocation,
  shippingAddress,
  items = [],
}) => {
  let destination = null;
  let deliveryAddress;
  let pincode;

  if (customerLocation) {
    const coordinates = validateCoordinates(customerLocation);
    deliveryAddress = await reverseGeocode(coordinates);
    pincode = deliveryAddress.pincode;
    if (!/^\d{6}$/.test(pincode))
      throw Object.assign(
        new Error("A valid Indian pincode is required for this location."),
        { statusCode: 400 },
      );
    destination = {
      ...coordinates,
      geocodingPrecision: "gps",
      resolvedAddress: deliveryAddress,
    };
  } else {
    if (
      !shippingAddress ||
      (!shippingAddress.address && !shippingAddress.houseShop) ||
      !shippingAddress.city ||
      !shippingAddress.state
    )
      throw Object.assign(new Error("A complete delivery address is required."), {
        statusCode: 400,
      });
    pincode = String(shippingAddress.pincode || "").trim();
    deliveryAddress = shippingAddress;
  }

  const postOffice = await getIndianPostOffice(pincode);
  const postalState = normalizeState(postOffice.State);
  if (!postalState || !postOffice.District)
    throw Object.assign(
      new Error("The delivery pincode does not have supported region data."),
      { statusCode: 400 },
    );
  if (
    deliveryAddress.state &&
    normalizeState(deliveryAddress.state).toLowerCase() !==
      postalState.toLowerCase()
  )
    throw Object.assign(new Error(INVALID_PINCODE_ERROR), { statusCode: 400 });

  if (!customerLocation) {
    try {
      const geocoded = await geocodeAddress(shippingAddress);
      if (geocoded.resolvedAddress.pincode !== pincode)
        throw Object.assign(
          new Error("The address does not match the supplied pincode."),
          { statusCode: 400 },
        );
      destination = geocoded;
    } catch (error) {
      if (error.statusCode) throw error;
      destination = null;
    }
  }

  if (!destination?.resolvedAddress) {
    deliveryAddress = locationParts({
      building: shippingAddress?.building,
      houseNumber: shippingAddress?.houseNumber,
      road: shippingAddress?.road,
      locality: shippingAddress?.locality,
      area: shippingAddress?.area,
      district: postOffice.District,
      city: shippingAddress?.city || postOffice.District,
      state: postOffice.State,
      pincode,
      country: "India",
    });
  } else {
    deliveryAddress = destination.resolvedAddress;
  }

  const origin = validateCoordinates(env.storeLocation);
  let route = null;
  if (destination) {
    route = await getRoadDistanceKm(origin, destination);
    if (route.distanceKm <= env.shippingRates.maximumDistanceKm) {
      return {
        distanceKm: Number(route.distanceKm.toFixed(3)),
        shippingCharge: calculateShippingCharge(route.distanceKm),
        shippingMethod: "local",
        estimated: false,
        distanceMethod: route.method,
        geocodingPrecision: destination.geocodingPrecision,
        location: deliveryAddress,
        fullAddress: deliveryAddress.fullAddress,
        locationDetected: Boolean(customerLocation),
        destination: {
          latitude: destination.latitude,
          longitude: destination.longitude,
        },
      };
    }
  }

  if (
    !destination &&
    (String(postOffice.District).trim().toLowerCase() === "bhopal" ||
      String(shippingAddress?.city || "").trim().toLowerCase() === "bhopal")
  )
    throw Object.assign(
      new Error(
        "We couldn't confirm the Bhopal delivery distance. Please try again or enter a more complete address.",
      ),
      { statusCode: 400 },
    );
  if (!Array.isArray(items) || items.length === 0)
    throw Object.assign(
      new Error("A cart is required to calculate shipping charges."),
      { statusCode: 400 },
    );
  const cartWeightKg = items.reduce(
    (total, item) => total + Number(item.quantityKg || 0),
    0,
  );
  const estimate = calculateEstimatedShipping({
    weightKg: cartWeightKg,
    state: postalState,
    distanceKm: route?.distanceKm,
    distanceMethod: route?.method,
  });
  const fullAddress =
    deliveryAddress.fullAddress ||
    locationParts({
      ...deliveryAddress,
      pincode,
      state: postalState,
      country: "India",
    }).fullAddress;
  return {
    distanceKm: route ? Number(route.distanceKm.toFixed(3)) : null,
    shippingCharge: estimate.shippingCharge,
    shippingMethod: "estimated",
    shippingZone: estimate.shippingZone,
    estimated: true,
    shipmentWeightKg: estimate.shipmentWeightKg,
    chargeableWeightKg: estimate.chargeableWeightKg,
    distanceMethod: route?.method,
    geocodingPrecision: destination?.geocodingPrecision || "postcode",
    location: deliveryAddress,
    fullAddress,
    locationDetected: Boolean(customerLocation),
    ...(destination && {
      destination: {
        latitude: destination.latitude,
        longitude: destination.longitude,
      },
    }),
  };
};

module.exports = {
  DELIVERY_AREA_ERROR,
  calculateDelivery,
  calculateHaversineDistance,
  calculateShippingCharge,
  calculateEstimatedShipping,
  getShippingZone,
  assertWithinDeliveryDistance,
  getIndianPostOffice,
};

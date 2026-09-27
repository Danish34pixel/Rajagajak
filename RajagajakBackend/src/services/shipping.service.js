const env = require("../config/env");

const DELIVERY_AREA_ERROR =
  "Sorry, we currently deliver only within our delivery area.";

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
  };
  return stateNames[normalized.toLowerCase()] || normalized;
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

const locationParts = ({ city = "", state = "", pincode = "" } = {}) => ({
  city: String(city).trim(),
  state: normalizeState(state),
  pincode: String(pincode).trim(),
});

const googleLocationParts = (components = []) => {
  const component = (type) =>
    components.find((item) => item.types?.includes(type))?.long_name || "";
  return locationParts({
    city:
      component("locality") ||
      component("postal_town") ||
      component("administrative_area_level_2"),
    state: component("administrative_area_level_1"),
    pincode: component("postal_code"),
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
    const featureCity = properties.city || properties.district;
    return (
      properties.osm_key === "place" &&
      properties.osm_value === "postcode" &&
      String(properties.name || "") === pincode &&
      String(properties.countrycode || "").toUpperCase() === "IN" &&
      fold(featureCity) === fold(city) &&
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
    return result.status === "OK" && result.results?.[0]
      ? googleLocationParts(result.results[0].address_components)
      : locationParts();
  }
  if (env.geocodingProvider !== "nominatim") return locationParts();
  const url = new URL(`${env.nominatimBaseUrl}/reverse`);
  url.searchParams.set("lat", String(coordinates.latitude));
  url.searchParams.set("lon", String(coordinates.longitude));
  url.searchParams.set("format", "jsonv2");
  try {
    const result = await requestJson(url, {
      headers: { "User-Agent": env.geocodingUserAgent },
    });
    return locationParts({
      city:
        result.address?.city ||
        result.address?.town ||
        result.address?.village ||
        result.address?.municipality ||
        result.address?.county,
      state: result.address?.state,
      pincode: result.address?.postcode,
    });
  } catch {
    return locationParts();
  }
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

const calculateDelivery = async ({ customerLocation, shippingAddress }) => {
  let destination;
  if (customerLocation) {
    const coordinates = validateCoordinates(customerLocation);
    destination = {
      ...coordinates,
      geocodingPrecision: "gps",
      resolvedAddress: await reverseGeocode(coordinates),
    };
  } else {
    destination = await geocodeAddress(shippingAddress);
  }
  const origin = validateCoordinates(env.storeLocation);
  const route = await getRoadDistanceKm(origin, destination);
  assertWithinDeliveryDistance(route.distanceKm);
  return {
    distanceKm: Number(route.distanceKm.toFixed(3)),
    shippingCharge: calculateShippingCharge(route.distanceKm),
    distanceMethod: route.method,
    geocodingPrecision: destination.geocodingPrecision,
    location: destination.resolvedAddress,
    destination: {
      latitude: destination.latitude,
      longitude: destination.longitude,
    },
  };
};

module.exports = {
  DELIVERY_AREA_ERROR,
  calculateDelivery,
  calculateHaversineDistance,
  calculateShippingCharge,
  assertWithinDeliveryDistance,
};

import test from "node:test";
import assert from "node:assert/strict";
import {
  getCurrentLocation,
  getLocationErrorMessage,
} from "../src/utils/location.js";

test("location detection returns coordinates when browser geolocation succeeds", async () => {
  const location = await getCurrentLocation(
    {
      getCurrentPosition(success) {
        success({ coords: { latitude: 23.2, longitude: 77.4 } });
      },
    },
    true,
  );

  assert.deepEqual(location, { latitude: 23.2, longitude: 77.4 });
});

test("location permission denial gives a manual address fallback", async () => {
  await assert.rejects(
    getCurrentLocation(
      {
        getCurrentPosition(_success, failure) {
          failure({ code: 1 });
        },
      },
      true,
    ),
    (error) => {
      assert.match(getLocationErrorMessage(error), /permission was denied/i);
      assert.match(getLocationErrorMessage(error), /manually/i);
      return true;
    },
  );
});

test("unavailable GPS and insecure contexts offer manual address entry", async () => {
  await assert.rejects(
    getCurrentLocation(undefined, true),
    (error) => {
      assert.match(getLocationErrorMessage(error), /not available/i);
      assert.match(getLocationErrorMessage(error), /manually/i);
      return true;
    },
  );
  await assert.rejects(
    getCurrentLocation({ getCurrentPosition() {} }, false),
    /secure HTTPS connection/i,
  );
});


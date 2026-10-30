export const getCurrentLocation = (
  geolocation = globalThis.navigator?.geolocation,
  secureContext = globalThis.isSecureContext,
) =>
  new Promise((resolve, reject) => {
    if (secureContext === false) {
      reject(
        new Error("Location detection requires a secure HTTPS connection."),
      );
      return;
    }
    if (!geolocation?.getCurrentPosition) {
      reject(
        new Error(
          "Location is not available in this browser. Please enter your delivery address manually.",
        ),
      );
      return;
    }
    geolocation.getCurrentPosition(
      ({ coords }) =>
        resolve({ latitude: coords.latitude, longitude: coords.longitude }),
      reject,
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  });

export const getLocationErrorMessage = (error) => {
  if (error?.code === 1)
    return "Location permission was denied. Please enter your delivery address manually.";
  if (error?.code === 2)
    return "Your location is unavailable. Please enter your delivery address manually.";
  if (error?.code === 3)
    return "Location detection timed out. Please try again or enter your delivery address manually.";
  return (
    error?.message ||
    "Unable to detect your location. Please enter your delivery address manually."
  );
};

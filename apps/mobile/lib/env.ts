const apiUrl = process.env.EXPO_PUBLIC_API_URL;

if (!apiUrl) {
  throw new Error(
    "EXPO_PUBLIC_API_URL is not set. Copy apps/mobile/.env.example to apps/mobile/.env and set it to your machine's LAN IP.",
  );
}

export const env = {
  API_URL: apiUrl,
};

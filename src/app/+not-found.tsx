import { Redirect } from 'expo-router';

/** Невідома адреса (стара закладка, вбудований перегляд) — на головну. */
export default function NotFound() {
  return <Redirect href="/" />;
}

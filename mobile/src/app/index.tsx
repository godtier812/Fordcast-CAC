import { Redirect } from 'expo-router';

// Day 1 only (02 §9.10): open straight on the smoke test. Day 2's NativeTabs shell (04 §16.4) replaces this file.
export default function Index() {
  return <Redirect href="/smoke" />;
}

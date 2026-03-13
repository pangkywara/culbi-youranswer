import { Redirect, useLocalSearchParams } from 'expo-router';

export default function PassportsRedirect() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Redirect href={`/collections/${id}?tab=Passports`} />;
}

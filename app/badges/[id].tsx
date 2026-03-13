import { Redirect, useLocalSearchParams } from 'expo-router';

export default function BadgesRedirect() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Redirect href={`/collections/${id}?tab=Badges`} />;
}

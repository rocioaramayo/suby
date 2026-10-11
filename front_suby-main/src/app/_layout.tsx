import { Stack } from 'expo-router';
import { AuthProvider } from '@/context/auth-context';
import { NotificationsProvider } from '@/context/notifications-context';

export default function RootLayout() {
  return (
    <AuthProvider>
      <NotificationsProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="login" />
          <Stack.Screen name="status/account-suspended" />
          <Stack.Screen name="status/no-internet" />
          <Stack.Screen name="first-login/change-password" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="auction/[id]" />
          <Stack.Screen name="lot/[id]" />
          <Stack.Screen name="lot/[id]/room" />
          <Stack.Screen name="notifications/index" />
          <Stack.Screen name="notifications/[id]" />
          <Stack.Screen name="owner-products" />
          <Stack.Screen name="profile/bid-history" />
          <Stack.Screen name="profile/bid-history/[itemId]" />
          <Stack.Screen name="won-items/[itemId]/payment" />
        </Stack>
      </NotificationsProvider>
    </AuthProvider>
  );
}

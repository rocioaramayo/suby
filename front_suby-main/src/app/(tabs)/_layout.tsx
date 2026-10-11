import { PRIMARY_BROWN } from '@/theme/colors';
import { Feather } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ 
      headerShown: false,
      tabBarActiveTintColor: PRIMARY_BROWN,
      tabBarInactiveTintColor: '#A0AEC0',
      tabBarStyle: { height: 60, paddingBottom: 10, paddingTop: 5 }
    }}>
      <Tabs.Screen 
        name="index" 
        options={{ 
          title: 'Inicio', 
          tabBarIcon: ({ color }) => <Feather name="home" size={24} color={color} /> 
        }} 
      />
      <Tabs.Screen 
        name="search" 
        options={{ 
          title: 'Piezas', 
          tabBarIcon: ({ color }) => <Feather name="search" size={24} color={color} /> 
        }} 
      />
      <Tabs.Screen 
        name="auctions" 
        options={{ 
          title: 'Subastas', 
          tabBarIcon: ({ color }) => <Feather name="list" size={24} color={color} /> 
        }} 
      />
      <Tabs.Screen 
        name="profile" 
        options={{ 
          title: 'Perfil', 
          tabBarIcon: ({ color }) => <Feather name="user" size={24} color={color} /> 
        }} 
      />
      <Tabs.Screen
        name="Fines"
        options={{
          href: null,
        }}
      />
      
    </Tabs>
  );
}

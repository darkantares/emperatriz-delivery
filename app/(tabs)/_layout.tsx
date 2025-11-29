import React from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';

import { useClientOnlyValue } from '@/components/useClientOnlyValue';
import { CustomColors } from '@/constants/CustomColors';

// You can explore the built-in icon families and icons on the web at https://icons.expo.fyi/
function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={28} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: CustomColors.secondary,
        tabBarInactiveTintColor: CustomColors.neutralLight,
        tabBarStyle: {
          backgroundColor: CustomColors.tabBarBackground,
          borderTopColor: 'transparent',
          elevation: 10,
          shadowColor: 'rgba(0,0,0,0.5)',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.25,
          shadowRadius: 5,
          height: 60,
        },
        tabBarLabelStyle: {
          fontWeight: 'bold',
        },
        headerShown: useClientOnlyValue(false, true),
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Elementos',
          tabBarIcon: ({ color }) => <TabBarIcon name="list" color={color} />,
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="two"
        options={{
          title: 'Ajustes',
          tabBarIcon: ({ color }) => <TabBarIcon name="gear" color={color} />,
          headerShown: false,
        }}
      />
    </Tabs>
  );
}

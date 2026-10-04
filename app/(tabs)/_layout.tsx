import { Tabs } from "expo-router";
import { Feather } from "@expo/vector-icons";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#14181B",
        tabBarInactiveTintColor: "#A6A9AD",
        tabBarStyle: {
          height: 65,
          paddingTop: 7,
          backgroundColor: "#FFFFFF",
          borderTopColor: "#E7E4DD",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Feather name="home" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="explore"
        options={{
          title: "Explore",
          tabBarIcon: ({ color, size }) => (
            <Feather name="compass" size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
  name="saved"
  options={{
    title: "Saved",
    tabBarIcon: ({ color, size }) => (
      <Feather
        name="bookmark"
        size={size}
        color={color}
      />
    ),
  }}
/>

      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => (
            <Feather name="user" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { Stack, router, useSegments } from "expo-router";

import type { Session } from "@supabase/supabase-js";

import { supabase } from "../lib/supabase";
import { useFavoritesStore } from "../store/favoritesStore";

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);

  const [loading, setLoading] = useState(true);

  const segments = useSegments();

  const loadFavorites = useFavoritesStore((state) => state.loadFavorites);

  // ---------------------------------------------------------
  // AUTH SESSION
  // ---------------------------------------------------------

  useEffect(() => {
    // Check existing session when app starts
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    // Listen for login / logout changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // ---------------------------------------------------------
  // LOAD USER FAVORITES
  // ---------------------------------------------------------

  useEffect(() => {
    if (loading) {
      return;
    }

    if (session?.user) {
      loadFavorites();
    } else {
      useFavoritesStore.setState({
        favorites: [],
      });
    }
  }, [session?.user?.id, loading, loadFavorites]);

  // ---------------------------------------------------------
  // AUTH ROUTING
  // ---------------------------------------------------------

  useEffect(() => {
    if (loading) {
      return;
    }

    const inAuthGroup = segments[0] === "(auth)";

    if (!session && !inAuthGroup) {
      router.replace("/(auth)/login");
    } else if (session && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [session, loading, segments]);

  // ---------------------------------------------------------
  // INITIAL LOADING
  // ---------------------------------------------------------

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#9C7A3C" />
      </View>
    );
  }

  // ---------------------------------------------------------
  // ROUTES
  // ---------------------------------------------------------

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FAF9F6",
  },
});

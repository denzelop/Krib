import { create } from "zustand";
import { supabase } from "../lib/supabase";

export type Property = {
  id: string;
  title: string;
  locality: string;
  price: string;
  type: "buy" | "rent";
  beds: number;
  propertyType: "Apartment" | "House";
  area: string;
  image: string;
  tag?: string;
};

type FavoritesStore = {
  favorites: Property[];
  loading: boolean;
  loadFavorites: () => Promise<void>;
  toggleFavorite: (property: Property) => Promise<void>;
  isFavorite: (id: string) => boolean;
};

export const useFavoritesStore = create<FavoritesStore>((set, get) => ({
  favorites: [],
  loading: false,

  // ---------------------------------------------------------
  // LOAD FAVORITES FROM SUPABASE
  // ---------------------------------------------------------

  loadFavorites: async () => {
    try {
      set({ loading: true });

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        set({
          favorites: [],
          loading: false,
        });

        return;
      }

      const { data, error } = await supabase
        .from("favorites")
        .select(
          `
          property_id,
          properties (
            id,
            title,
            locality,
            price,
            listing_type,
            property_type,
            bedrooms,
            area,
            image_url,
            featured
          )
        `,
        )
        .eq("user_id", user.id);

      if (error) {
        console.error("Error fetching favorites:", error.message);

        return;
      }

      const loadedFavorites: Property[] = [];

      if (data) {
        data.forEach((item: any) => {
          const prop = Array.isArray(item.properties)
            ? item.properties[0]
            : item.properties;

          if (!prop) {
            return;
          }

          loadedFavorites.push({
            id: String(prop.id),

            title: prop.title,

            locality: prop.locality,

            price: prop.price,

            type: prop.listing_type as "buy" | "rent",

            beds: prop.bedrooms,

            propertyType: prop.property_type as "Apartment" | "House",

            area: prop.area,

            image: prop.image_url,

            tag: prop.featured ? "Featured" : undefined,
          });
        });
      }

      set({
        favorites: loadedFavorites,
      });
    } catch (error) {
      console.error("Unexpected error loading favorites:", error);
    } finally {
      set({
        loading: false,
      });
    }
  },

  // ---------------------------------------------------------
  // ADD / REMOVE FAVORITE
  // ---------------------------------------------------------

  toggleFavorite: async (property: Property) => {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        console.error("User not authenticated. Cannot update favorites.");

        return;
      }

      const alreadySaved = get().favorites.some(
        (item) => item.id === property.id,
      );

      // -----------------------------------------------------
      // REMOVE FAVORITE
      // -----------------------------------------------------

      if (alreadySaved) {
        const { error } = await supabase
          .from("favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("property_id", property.id);

        if (error) {
          console.error("Error deleting favorite:", error.message);

          return;
        }

        set((state) => ({
          favorites: state.favorites.filter((item) => item.id !== property.id),
        }));

        return;
      }

      // -----------------------------------------------------
      // ADD FAVORITE
      // -----------------------------------------------------

      const { error } = await supabase.from("favorites").insert({
        user_id: user.id,
        property_id: property.id,
      });

      if (error) {
        console.error("Error adding favorite:", error.message);

        return;
      }

      set((state) => {
        const alreadyExists = state.favorites.some(
          (item) => item.id === property.id,
        );

        if (alreadyExists) {
          return state;
        }

        return {
          favorites: [...state.favorites, property],
        };
      });
    } catch (error) {
      console.error("Unexpected error toggling favorite:", error);
    }
  },

  // ---------------------------------------------------------
  // CHECK FAVORITE
  // ---------------------------------------------------------

  isFavorite: (id: string) => {
    return get().favorites.some((item) => item.id === id);
  },
}));

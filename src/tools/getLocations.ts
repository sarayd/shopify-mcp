import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";

// Input schema for getLocations
const GetLocationsInputSchema = z.object({
  active: z.boolean().optional(),
  limit: z.number().default(10)
});

type GetLocationsInput = z.infer<typeof GetLocationsInputSchema>;

// Will be initialized in index.ts
let shopifyClient: GraphQLClient;

const getLocations = {
  name: "get-locations",
  description: "Get store locations with optional filtering by active status",
  schema: GetLocationsInputSchema,

  // Add initialize method to set up the GraphQL client
  initialize(client: GraphQLClient) {
    shopifyClient = client;
  },

  execute: async (input: GetLocationsInput) => {
    try {
      const { active, limit } = input;

      // Build query filters
      let queryFilter = "";
      if (active !== undefined) {
        queryFilter = `is_active:${active}`;
      }

      const query = gql`
        query GetLocations($first: Int!, $query: String) {
          locations(first: $first, query: $query) {
            edges {
              node {
                id
                name
                isActive
                address {
                  address1
                  address2
                  city
                  province
                  provinceCode
                  zip
                  country
                  countryCode
                  phone
                  formatted
                }
                fulfillsOnlineOrders
                hasActiveInventory
                legacyResourceId
                shipsInventory
                supportsLocalDelivery
                supportsLocalPickup
                localPickupSettings {
                  instructions
                  fee {
                    amount
                    currencyCode
                  }
                }
                localDeliverySettings {
                  instructions
                  fee {
                    amount
                    currencyCode
                  }
                  minimumOrderPrice {
                    amount
                    currencyCode
                  }
                  minimumDeliveryRadius {
                    unit
                    value
                  }
                  maximumDeliveryRadius {
                    unit
                    value
                  }
                }
              }
            }
          }
        }
      `;

      const variables = {
        first: limit,
        query: queryFilter || undefined
      };

      const data = (await shopifyClient.request(query, variables)) as {
        locations: any;
      };

      // Extract and format location data
      const locations = data.locations.edges.map((edge: any) => {
        const location = edge.node;
        
        return {
          id: location.id,
          name: location.name,
          isActive: location.isActive,
          address: location.address,
          fulfillsOnlineOrders: location.fulfillsOnlineOrders,
          hasActiveInventory: location.hasActiveInventory,
          legacyResourceId: location.legacyResourceId,
          shipsInventory: location.shipsInventory,
          supportsLocalDelivery: location.supportsLocalDelivery,
          supportsLocalPickup: location.supportsLocalPickup,
          localPickupSettings: location.localPickupSettings,
          localDeliverySettings: location.localDeliverySettings
        };
      });

      return { locations };
    } catch (error) {
      console.error("Error fetching locations:", error);
      throw new Error(
        `Failed to fetch locations: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
};

export { getLocations };

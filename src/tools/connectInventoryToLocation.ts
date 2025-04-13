import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";

// Input schema for connecting inventory to location
const ConnectInventoryToLocationInputSchema = z.object({
  inventoryItemId: z.string().min(1, "Inventory item ID is required"),
  locationId: z.string().min(1, "Location ID is required"),
  available: z.number().int("Available quantity must be an integer"),
  reason: z.string().optional()
});

type ConnectInventoryToLocationInput = z.infer<typeof ConnectInventoryToLocationInputSchema>;

// Will be initialized in index.ts
let shopifyClient: GraphQLClient;

const connectInventoryToLocation = {
  name: "connect-inventory-to-location",
  description: "Connect an inventory item to a location and set its available quantity",
  schema: ConnectInventoryToLocationInputSchema,

  // Add initialize method to set up the GraphQL client
  initialize(client: GraphQLClient) {
    shopifyClient = client;
  },

  execute: async (input: ConnectInventoryToLocationInput) => {
    try {
      const { inventoryItemId, locationId, available, reason } = input;

      // Convert IDs to GID format if they aren't already
      const formattedInventoryItemId = inventoryItemId.startsWith('gid://')
        ? inventoryItemId
        : `gid://shopify/InventoryItem/${inventoryItemId}`;

      const formattedLocationId = locationId.startsWith('gid://')
        ? locationId
        : `gid://shopify/Location/${locationId}`;

      const query = gql`
        mutation inventoryActivate($inventoryItemId: ID!, $locationId: ID!, $available: Int!, $reason: String) {
          inventoryActivate(inventoryItemId: $inventoryItemId, locationId: $locationId, available: $available, reason: $reason) {
            inventoryLevel {
              id
              available
              item {
                id
                tracked
                variant {
                  id
                  displayName
                  sku
                  product {
                    id
                    title
                  }
                }
              }
              location {
                id
                name
                isActive
              }
            }
            userErrors {
              field
              message
            }
          }
        }
      `;

      const variables = {
        inventoryItemId: formattedInventoryItemId,
        locationId: formattedLocationId,
        available,
        reason
      };

      const data = (await shopifyClient.request(query, variables)) as {
        inventoryActivate: {
          inventoryLevel: any;
          userErrors: Array<{
            field: string;
            message: string;
          }>;
        };
      };

      // If there are user errors, throw an error
      if (data.inventoryActivate.userErrors.length > 0) {
        throw new Error(
          `Failed to connect inventory to location: ${data.inventoryActivate.userErrors
            .map((e) => `${e.field}: ${e.message}`)
            .join(", ")}`
        );
      }

      // Format and return the created inventory level
      const inventoryLevel = data.inventoryActivate.inventoryLevel;
      
      return {
        inventoryLevel: {
          id: inventoryLevel.id,
          available: inventoryLevel.available,
          item: inventoryLevel.item ? {
            id: inventoryLevel.item.id,
            tracked: inventoryLevel.item.tracked,
            variant: inventoryLevel.item.variant ? {
              id: inventoryLevel.item.variant.id,
              displayName: inventoryLevel.item.variant.displayName,
              sku: inventoryLevel.item.variant.sku,
              product: inventoryLevel.item.variant.product ? {
                id: inventoryLevel.item.variant.product.id,
                title: inventoryLevel.item.variant.product.title
              } : null
            } : null
          } : null,
          location: inventoryLevel.location ? {
            id: inventoryLevel.location.id,
            name: inventoryLevel.location.name,
            isActive: inventoryLevel.location.isActive
          } : null
        }
      };
    } catch (error) {
      console.error("Error connecting inventory to location:", error);
      throw new Error(
        `Failed to connect inventory to location: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
};

export { connectInventoryToLocation };

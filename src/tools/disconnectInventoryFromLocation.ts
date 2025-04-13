import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";

// Input schema for disconnecting inventory from location
const DisconnectInventoryFromLocationInputSchema = z.object({
  inventoryItemId: z.string().min(1, "Inventory item ID is required"),
  locationId: z.string().min(1, "Location ID is required"),
  reason: z.string().optional()
});

type DisconnectInventoryFromLocationInput = z.infer<typeof DisconnectInventoryFromLocationInputSchema>;

// Will be initialized in index.ts
let shopifyClient: GraphQLClient;

const disconnectInventoryFromLocation = {
  name: "disconnect-inventory-from-location",
  description: "Disconnect an inventory item from a location in Shopify",
  schema: DisconnectInventoryFromLocationInputSchema,

  // Add initialize method to set up the GraphQL client
  initialize(client: GraphQLClient) {
    shopifyClient = client;
  },

  execute: async (input: DisconnectInventoryFromLocationInput) => {
    try {
      const { inventoryItemId, locationId, reason } = input;

      // Convert IDs to GID format if they aren't already
      const formattedInventoryItemId = inventoryItemId.startsWith('gid://')
        ? inventoryItemId
        : `gid://shopify/InventoryItem/${inventoryItemId}`;

      const formattedLocationId = locationId.startsWith('gid://')
        ? locationId
        : `gid://shopify/Location/${locationId}`;

      const query = gql`
        mutation inventoryDeactivate($inventoryItemId: ID!, $locationId: ID!, $reason: String) {
          inventoryDeactivate(inventoryItemId: $inventoryItemId, locationId: $locationId, reason: $reason) {
            userErrors {
              field
              message
            }
            inventoryLevel {
              id
              deactivated
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
          }
        }
      `;

      const variables = {
        inventoryItemId: formattedInventoryItemId,
        locationId: formattedLocationId,
        reason
      };

      const data = (await shopifyClient.request(query, variables)) as {
        inventoryDeactivate: {
          inventoryLevel: any;
          userErrors: Array<{
            field: string;
            message: string;
          }>;
        };
      };

      // If there are user errors, throw an error
      if (data.inventoryDeactivate.userErrors.length > 0) {
        throw new Error(
          `Failed to disconnect inventory from location: ${data.inventoryDeactivate.userErrors
            .map((e) => `${e.field}: ${e.message}`)
            .join(", ")}`
        );
      }

      // Format and return the deactivated inventory level
      const inventoryLevel = data.inventoryDeactivate.inventoryLevel;
      
      return {
        inventoryLevel: {
          id: inventoryLevel.id,
          deactivated: inventoryLevel.deactivated,
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
      console.error("Error disconnecting inventory from location:", error);
      throw new Error(
        `Failed to disconnect inventory from location: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
};

export { disconnectInventoryFromLocation };

import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";

// Input schema for adjusting inventory
const AdjustInventoryInputSchema = z.object({
  inventoryItemId: z.string().min(1, "Inventory item ID is required"),
  availableDelta: z.number().int("Delta must be an integer"),
  locationId: z.string().min(1, "Location ID is required"),
  reason: z.string().optional()
});

type AdjustInventoryInput = z.infer<typeof AdjustInventoryInputSchema>;

// Will be initialized in index.ts
let shopifyClient: GraphQLClient;

const adjustInventory = {
  name: "adjust-inventory",
  description: "Adjust inventory levels for a specific item at a location",
  schema: AdjustInventoryInputSchema,

  // Add initialize method to set up the GraphQL client
  initialize(client: GraphQLClient) {
    shopifyClient = client;
  },

  execute: async (input: AdjustInventoryInput) => {
    try {
      const { inventoryItemId, availableDelta, locationId, reason } = input;

      // Convert IDs to GID format if they aren't already
      const formattedInventoryItemId = inventoryItemId.startsWith('gid://')
        ? inventoryItemId
        : `gid://shopify/InventoryItem/${inventoryItemId}`;

      const formattedLocationId = locationId.startsWith('gid://')
        ? locationId
        : `gid://shopify/Location/${locationId}`;

      const query = gql`
        mutation inventoryAdjustQuantity($input: InventoryAdjustQuantityInput!) {
          inventoryAdjustQuantity(input: $input) {
            inventoryLevel {
              id
              available
              item {
                id
                inventoryQuantity
                tracked
                variant {
                  id
                  displayName
                  inventoryQuantity
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
        input: {
          inventoryItemId: formattedInventoryItemId,
          availableDelta,
          locationId: formattedLocationId,
          reason
        }
      };

      const data = (await shopifyClient.request(query, variables)) as {
        inventoryAdjustQuantity: {
          inventoryLevel: any;
          userErrors: Array<{
            field: string;
            message: string;
          }>;
        };
      };

      // If there are user errors, throw an error
      if (data.inventoryAdjustQuantity.userErrors.length > 0) {
        throw new Error(
          `Failed to adjust inventory: ${data.inventoryAdjustQuantity.userErrors
            .map((e) => `${e.field}: ${e.message}`)
            .join(", ")}`
        );
      }

      // Format and return the updated inventory level
      const inventoryLevel = data.inventoryAdjustQuantity.inventoryLevel;
      
      return {
        inventoryLevel: {
          id: inventoryLevel.id,
          available: inventoryLevel.available,
          item: inventoryLevel.item ? {
            id: inventoryLevel.item.id,
            inventoryQuantity: inventoryLevel.item.inventoryQuantity,
            tracked: inventoryLevel.item.tracked,
            variant: inventoryLevel.item.variant ? {
              id: inventoryLevel.item.variant.id,
              displayName: inventoryLevel.item.variant.displayName,
              inventoryQuantity: inventoryLevel.item.variant.inventoryQuantity,
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
      console.error("Error adjusting inventory:", error);
      throw new Error(
        `Failed to adjust inventory: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
};

export { adjustInventory };

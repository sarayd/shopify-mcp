import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";

// Input schema for setting inventory tracking
const SetInventoryTrackingInputSchema = z.object({
  inventoryItemId: z.string().min(1, "Inventory item ID is required"),
  tracked: z.boolean()
});

type SetInventoryTrackingInput = z.infer<typeof SetInventoryTrackingInputSchema>;

// Will be initialized in index.ts
let shopifyClient: GraphQLClient;

const setInventoryTracking = {
  name: "set-inventory-tracking",
  description: "Enable or disable inventory tracking for an item in Shopify",
  schema: SetInventoryTrackingInputSchema,

  // Add initialize method to set up the GraphQL client
  initialize(client: GraphQLClient) {
    shopifyClient = client;
  },

  execute: async (input: SetInventoryTrackingInput) => {
    try {
      const { inventoryItemId, tracked } = input;

      // Convert ID to GID format if it isn't already
      const formattedInventoryItemId = inventoryItemId.startsWith('gid://')
        ? inventoryItemId
        : `gid://shopify/InventoryItem/${inventoryItemId}`;

      const query = gql`
        mutation inventoryItemUpdate($input: InventoryItemUpdateInput!) {
          inventoryItemUpdate(input: $input) {
            inventoryItem {
              id
              tracked
              inventoryLevels(first: 5) {
                edges {
                  node {
                    id
                    available
                    location {
                      id
                      name
                    }
                  }
                }
              }
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
            userErrors {
              field
              message
            }
          }
        }
      `;

      const variables = {
        input: {
          id: formattedInventoryItemId,
          tracked
        }
      };

      const data = (await shopifyClient.request(query, variables)) as {
        inventoryItemUpdate: {
          inventoryItem: any;
          userErrors: Array<{
            field: string;
            message: string;
          }>;
        };
      };

      // If there are user errors, throw an error
      if (data.inventoryItemUpdate.userErrors.length > 0) {
        throw new Error(
          `Failed to set inventory tracking: ${data.inventoryItemUpdate.userErrors
            .map((e) => `${e.field}: ${e.message}`)
            .join(", ")}`
        );
      }

      // Format and return the updated inventory item
      const inventoryItem = data.inventoryItemUpdate.inventoryItem;
      
      // Format inventory levels
      const inventoryLevels = inventoryItem.inventoryLevels.edges.map((edge: any) => {
        const level = edge.node;
        return {
          id: level.id,
          available: level.available,
          location: level.location ? {
            id: level.location.id,
            name: level.location.name
          } : null
        };
      });

      return {
        inventoryItem: {
          id: inventoryItem.id,
          tracked: inventoryItem.tracked,
          inventoryLevels,
          variant: inventoryItem.variant ? {
            id: inventoryItem.variant.id,
            displayName: inventoryItem.variant.displayName,
            sku: inventoryItem.variant.sku,
            product: inventoryItem.variant.product ? {
              id: inventoryItem.variant.product.id,
              title: inventoryItem.variant.product.title
            } : null
          } : null
        }
      };
    } catch (error) {
      console.error("Error setting inventory tracking:", error);
      throw new Error(
        `Failed to set inventory tracking: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
};

export { setInventoryTracking };

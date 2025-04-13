import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";

// Input schema for getInventoryItems
const GetInventoryItemsInputSchema = z.object({
  query: z.string().optional(),
  productId: z.string().optional(),
  variantId: z.string().optional(),
  limit: z.number().default(10)
});

type GetInventoryItemsInput = z.infer<typeof GetInventoryItemsInputSchema>;

// Will be initialized in index.ts
let shopifyClient: GraphQLClient;

const getInventoryItems = {
  name: "get-inventory-items",
  description: "Get inventory items with optional filtering",
  schema: GetInventoryItemsInputSchema,

  // Add initialize method to set up the GraphQL client
  initialize(client: GraphQLClient) {
    shopifyClient = client;
  },

  execute: async (input: GetInventoryItemsInput) => {
    try {
      const { query, productId, variantId, limit } = input;

      // Build query filters
      let queryFilter = "";
      
      if (query) {
        queryFilter = query;
      }
      
      if (productId) {
        const formattedProductId = productId.startsWith('gid://') 
          ? productId 
          : `gid://shopify/Product/${productId}`;
        queryFilter += queryFilter ? ` AND product_id:${formattedProductId}` : `product_id:${formattedProductId}`;
      }
      
      if (variantId) {
        const formattedVariantId = variantId.startsWith('gid://') 
          ? variantId 
          : `gid://shopify/ProductVariant/${variantId}`;
        queryFilter += queryFilter ? ` AND variant_id:${formattedVariantId}` : `variant_id:${formattedVariantId}`;
      }

      const gqlQuery = gql`
        query GetInventoryItems($first: Int!, $query: String) {
          inventoryItems(first: $first, query: $query) {
            edges {
              node {
                id
                tracked
                countryCodeOfOrigin
                harmonizedSystemCode
                inventoryHistoryUrl
                inventoryLevels(first: 5) {
                  edges {
                    node {
                      id
                      available
                      location {
                        id
                        name
                        isActive
                      }
                    }
                  }
                }
                legacyResourceId
                requiresShipping
                sku
                tracked
                unitCost {
                  amount
                  currencyCode
                }
                variant {
                  id
                  displayName
                  sku
                  inventoryQuantity
                  inventoryManagement
                  inventoryPolicy
                  product {
                    id
                    title
                    handle
                    status
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

      const data = (await shopifyClient.request(gqlQuery, variables)) as {
        inventoryItems: any;
      };

      // Extract and format inventory items data
      const inventoryItems = data.inventoryItems.edges.map((edge: any) => {
        const item = edge.node;
        
        // Format inventory levels
        const inventoryLevels = item.inventoryLevels.edges.map((levelEdge: any) => {
          const level = levelEdge.node;
          return {
            id: level.id,
            available: level.available,
            location: level.location ? {
              id: level.location.id,
              name: level.location.name,
              isActive: level.location.isActive
            } : null
          };
        });

        return {
          id: item.id,
          tracked: item.tracked,
          countryCodeOfOrigin: item.countryCodeOfOrigin,
          harmonizedSystemCode: item.harmonizedSystemCode,
          inventoryHistoryUrl: item.inventoryHistoryUrl,
          inventoryLevels,
          legacyResourceId: item.legacyResourceId,
          requiresShipping: item.requiresShipping,
          sku: item.sku,
          unitCost: item.unitCost,
          variant: item.variant ? {
            id: item.variant.id,
            displayName: item.variant.displayName,
            sku: item.variant.sku,
            inventoryQuantity: item.variant.inventoryQuantity,
            inventoryManagement: item.variant.inventoryManagement,
            inventoryPolicy: item.variant.inventoryPolicy,
            product: item.variant.product ? {
              id: item.variant.product.id,
              title: item.variant.product.title,
              handle: item.variant.product.handle,
              status: item.variant.product.status
            } : null
          } : null
        };
      });

      return { inventoryItems };
    } catch (error) {
      console.error("Error fetching inventory items:", error);
      throw new Error(
        `Failed to fetch inventory items: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
};

export { getInventoryItems };

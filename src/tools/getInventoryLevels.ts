import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";

// Input schema for getInventoryLevels
const GetInventoryLevelsInputSchema = z.object({
  locationId: z.string().optional(),
  limit: z.number().default(10)
});

type GetInventoryLevelsInput = z.infer<typeof GetInventoryLevelsInputSchema>;

// Will be initialized in index.ts
let shopifyClient: GraphQLClient;

const getInventoryLevels = {
  name: "get-inventory-levels",
  description: "Get inventory levels with optional filtering by location",
  schema: GetInventoryLevelsInputSchema,

  // Add initialize method to set up the GraphQL client
  initialize(client: GraphQLClient) {
    shopifyClient = client;
  },

  execute: async (input: GetInventoryLevelsInput) => {
    try {
      const { locationId, limit } = input;

      // Build query filters
      let queryFilter = "";
      if (locationId) {
        queryFilter = `location_id:${locationId}`;
      }

      const query = gql`
        query GetInventoryLevels($first: Int!, $query: String) {
          inventoryLevels(first: $first, query: $query) {
            edges {
              node {
                id
                available
                incoming
                item {
                  id
                  sku
                  tracked
                  variant {
                    id
                    displayName
                    product {
                      id
                      title
                    }
                  }
                }
                location {
                  id
                  name
                  address {
                    address1
                    address2
                    city
                    provinceCode
                    zip
                    country
                  }
                  isActive
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
        inventoryLevels: any;
      };

      // Extract and format inventory levels data
      const inventoryLevels = data.inventoryLevels.edges.map((edge: any) => {
        const level = edge.node;
        
        return {
          id: level.id,
          available: level.available,
          incoming: level.incoming,
          item: level.item ? {
            id: level.item.id,
            sku: level.item.sku,
            tracked: level.item.tracked,
            variant: level.item.variant ? {
              id: level.item.variant.id,
              displayName: level.item.variant.displayName,
              product: level.item.variant.product ? {
                id: level.item.variant.product.id,
                title: level.item.variant.product.title
              } : null
            } : null
          } : null,
          location: level.location ? {
            id: level.location.id,
            name: level.location.name,
            address: level.location.address,
            isActive: level.location.isActive
          } : null
        };
      });

      return { inventoryLevels };
    } catch (error) {
      console.error("Error fetching inventory levels:", error);
      throw new Error(
        `Failed to fetch inventory levels: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
};

export { getInventoryLevels };

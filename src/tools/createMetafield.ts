import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";

// Input schema for creating a metafield
const CreateMetafieldInputSchema = z.object({
  ownerId: z.string().min(1, "Owner ID is required"),
  namespace: z.string().min(1, "Namespace is required"),
  key: z.string().min(1, "Key is required"),
  value: z.string().min(1, "Value is required"),
  type: z.string().min(1, "Type is required"),
  description: z.string().optional(),
  ownerType: z.enum([
    "ARTICLE",
    "BLOG",
    "COLLECTION",
    "CUSTOMER",
    "DRAFTORDER",
    "ORDER",
    "PAGE",
    "PRODUCT",
    "PRODUCTIMAGE",
    "PRODUCTVARIANT",
    "SHOP"
  ]).default("PRODUCT")
});

type CreateMetafieldInput = z.infer<typeof CreateMetafieldInputSchema>;

// Will be initialized in index.ts
let shopifyClient: GraphQLClient;

const createMetafield = {
  name: "create-metafield",
  description: "Create a new metafield for a resource in Shopify",
  schema: CreateMetafieldInputSchema,

  // Add initialize method to set up the GraphQL client
  initialize(client: GraphQLClient) {
    shopifyClient = client;
  },

  execute: async (input: CreateMetafieldInput) => {
    try {
      const { ownerId, namespace, key, value, type, description, ownerType } = input;

      // Prepare the mutation input
      const metafieldInput = {
        ownerId,
        namespace,
        key,
        value,
        type,
        description
      };

      const query = gql`
        mutation metafieldCreate($input: MetafieldInput!) {
          metafieldCreate(input: $input) {
            metafield {
              id
              namespace
              key
              value
              type
              description
              createdAt
              updatedAt
              ownerType
            }
            userErrors {
              field
              message
            }
          }
        }
      `;

      const variables = {
        input: metafieldInput
      };

      const data = (await shopifyClient.request(query, variables)) as {
        metafieldCreate: {
          metafield: any;
          userErrors: Array<{
            field: string;
            message: string;
          }>;
        };
      };

      // If there are user errors, throw an error
      if (data.metafieldCreate.userErrors.length > 0) {
        throw new Error(
          `Failed to create metafield: ${data.metafieldCreate.userErrors
            .map((e) => `${e.field}: ${e.message}`)
            .join(", ")}`
        );
      }

      // Format and return the created metafield
      const metafield = data.metafieldCreate.metafield;

      return {
        metafield: {
          id: metafield.id,
          namespace: metafield.namespace,
          key: metafield.key,
          value: metafield.value,
          type: metafield.type,
          description: metafield.description,
          createdAt: metafield.createdAt,
          updatedAt: metafield.updatedAt,
          ownerType: metafield.ownerType
        }
      };
    } catch (error) {
      console.error("Error creating metafield:", error);
      throw new Error(
        `Failed to create metafield: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
};

export { createMetafield };

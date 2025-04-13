import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";

// Input schema for creating a fulfillment
const CreateFulfillmentInputSchema = z.object({
  orderId: z.string().min(1),
  trackingInfo: z
    .object({
      number: z.string().optional(),
      url: z.string().optional(),
      company: z.string().optional()
    })
    .optional(),
  notifyCustomer: z.boolean().default(true),
  lineItems: z
    .array(
      z.object({
        id: z.string().min(1),
        quantity: z.number().int().positive()
      })
    )
    .optional(),
  locationId: z.string().optional(),
  trackingNumbers: z.array(z.string()).optional(),
  trackingUrls: z.array(z.string()).optional(),
  metadata: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
    .optional()
});

type CreateFulfillmentInput = z.infer<typeof CreateFulfillmentInputSchema>;

// Will be initialized in index.ts
let shopifyClient: GraphQLClient;

const createFulfillment = {
  name: "create-fulfillment",
  description: "Create a new fulfillment for an order in Shopify",
  schema: CreateFulfillmentInputSchema,

  // Add initialize method to set up the GraphQL client
  initialize(client: GraphQLClient) {
    shopifyClient = client;
  },

  execute: async (input: CreateFulfillmentInput) => {
    try {
      const { orderId, lineItems, trackingInfo, notifyCustomer, locationId, trackingNumbers, trackingUrls, metadata } = input;

      // Prepare the mutation input
      const fulfillmentInput: any = {
        orderId,
        notifyCustomer,
      };

      // Add optional fields if provided
      if (lineItems && lineItems.length > 0) {
        fulfillmentInput.lineItems = lineItems;
      }

      if (trackingInfo) {
        fulfillmentInput.trackingInfo = trackingInfo;
      }

      if (locationId) {
        fulfillmentInput.locationId = locationId;
      }

      if (trackingNumbers && trackingNumbers.length > 0) {
        fulfillmentInput.trackingNumbers = trackingNumbers;
      }

      if (trackingUrls && trackingUrls.length > 0) {
        fulfillmentInput.trackingUrls = trackingUrls;
      }

      if (metadata) {
        fulfillmentInput.metadata = metadata;
      }

      const query = gql`
        mutation fulfillmentCreate($fulfillment: FulfillmentInput!) {
          fulfillmentCreate(fulfillment: $fulfillment) {
            fulfillment {
              id
              status
              createdAt
              updatedAt
              trackingInfo {
                number
                url
                company
              }
              trackingNumbers
              trackingUrls
              legacyResourceId
              deliveredAt
              displayStatus
              estimatedDeliveryAt
              name
              originAddress {
                address1
                address2
                city
                country
                countryCode
                phone
                province
                provinceCode
                zip
              }
              service {
                id
                handle
                name
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
        fulfillment: fulfillmentInput
      };

      const data = (await shopifyClient.request(query, variables)) as {
        fulfillmentCreate: {
          fulfillment: any;
          userErrors: Array<{
            field: string;
            message: string;
          }>;
        };
      };

      // If there are user errors, throw an error
      if (data.fulfillmentCreate.userErrors.length > 0) {
        throw new Error(
          `Failed to create fulfillment: ${data.fulfillmentCreate.userErrors
            .map((e) => `${e.field}: ${e.message}`)
            .join(", ")}`
        );
      }

      // Format and return the created fulfillment
      const fulfillment = data.fulfillmentCreate.fulfillment;

      return {
        fulfillment: {
          id: fulfillment.id,
          status: fulfillment.status,
          createdAt: fulfillment.createdAt,
          updatedAt: fulfillment.updatedAt,
          trackingInfo: fulfillment.trackingInfo,
          trackingNumbers: fulfillment.trackingNumbers,
          trackingUrls: fulfillment.trackingUrls,
          legacyResourceId: fulfillment.legacyResourceId,
          deliveredAt: fulfillment.deliveredAt,
          displayStatus: fulfillment.displayStatus,
          estimatedDeliveryAt: fulfillment.estimatedDeliveryAt,
          name: fulfillment.name,
          originAddress: fulfillment.originAddress,
          service: fulfillment.service
        }
      };
    } catch (error) {
      console.error("Error creating fulfillment:", error);
      throw new Error(
        `Failed to create fulfillment: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
};

export { createFulfillment };

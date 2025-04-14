import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";

// Input schema for creating a customer
const CreateCustomerInputSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email(),
  phone: z.string().optional(),
  taxExempt: z.boolean().optional(),
  smsMarketingConsent: z
    .object({
      marketingState: z.enum(["SUBSCRIBED", "NOT_SUBSCRIBED", "PENDING", "UNSUBSCRIBED"]),
      marketingOptInLevel: z.enum(["SINGLE_OPT_IN", "CONFIRMED_OPT_IN", "UNKNOWN"]).optional()
    })
    .optional(),
  metafields: z
    .array(
      z.object({
        namespace: z.string(),
        key: z.string(),
        value: z.string(),
        type: z.string()
      })
    )
    .optional()
});

type CreateCustomerInput = z.infer<typeof CreateCustomerInputSchema>;

// Will be initialized in index.ts
let shopifyClient: GraphQLClient;

const createCustomer = {
  name: "create-customer",
  description: "Create a new customer in Shopify",
  schema: CreateCustomerInputSchema,

  // Add initialize method to set up the GraphQL client
  initialize(client: GraphQLClient) {
    shopifyClient = client;
  },

  execute: async (input: CreateCustomerInput) => {
    try {
      const query = gql`
        mutation customerCreate($input: CustomerInput!) {
          customerCreate(input: $input) {
            userErrors {
              field
              message
            }
            customer {
              id
              email
              phone
              taxExempt
              firstName
              lastName
              amountSpent {
                amount
                currencyCode
              }
              smsMarketingConsent {
                marketingState
                marketingOptInLevel
                consentUpdatedAt
              }
            }
          }
        }
      `;

      const variables = {
        input: input
      };

      const data = (await shopifyClient.request(query, variables)) as {
        customerCreate: {
          customer: any;
          userErrors: Array<{
            field: string;
            message: string;
          }>;
        };
      };

      // If there are user errors, throw an error
      if (data.customerCreate.userErrors.length > 0) {
        throw new Error(
          `Failed to create customer: ${data.customerCreate.userErrors
            .map((e) => `${e.field}: ${e.message}`)
            .join(", ")}`
        );
      }

      // Return the created customer directly from the API response
      return {
        customer: data.customerCreate.customer
      };
    } catch (error) {
      console.error("Error creating customer:", error);
      throw new Error(
        `Failed to create customer: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
};

export { createCustomer };

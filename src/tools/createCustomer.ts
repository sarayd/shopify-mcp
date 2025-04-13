import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";

// Input schema for creating a customer
const CreateCustomerInputSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email(),
  phone: z.string().optional(),
  tags: z.array(z.string()).optional(),
  note: z.string().optional(),
  acceptsMarketing: z.boolean().optional(),
  taxExempt: z.boolean().optional(),
  password: z.string().optional(),
  passwordConfirmation: z.string().optional(),
  addresses: z
    .array(
      z.object({
        address1: z.string().optional(),
        address2: z.string().optional(),
        city: z.string().optional(),
        company: z.string().optional(),
        country: z.string().optional(),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        phone: z.string().optional(),
        province: z.string().optional(),
        zip: z.string().optional(),
        default: z.boolean().optional()
      })
    )
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
            customer {
              id
              firstName
              lastName
              email
              phone
              tags
              note
              taxExempt
              acceptsMarketing
              addresses {
                id
                address1
                address2
                city
                company
                country
                firstName
                lastName
                phone
                province
                zip
              }
              defaultAddress {
                id
                address1
                address2
                city
                company
                country
                firstName
                lastName
                phone
                province
                zip
              }
              metafields(first: 10) {
                edges {
                  node {
                    id
                    namespace
                    key
                    value
                    type
                  }
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
          ...input
        }
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

      // Format and return the created customer
      const customer = data.customerCreate.customer;

      // Format metafields if they exist
      const metafields =
        customer.metafields?.edges.map((edge: any) => edge.node) || [];

      return {
        customer: {
          id: customer.id,
          firstName: customer.firstName,
          lastName: customer.lastName,
          email: customer.email,
          phone: customer.phone,
          tags: customer.tags,
          note: customer.note,
          taxExempt: customer.taxExempt,
          acceptsMarketing: customer.acceptsMarketing,
          addresses: customer.addresses,
          defaultAddress: customer.defaultAddress,
          metafields
        }
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

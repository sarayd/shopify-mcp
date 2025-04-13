import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";

// Input schema for updating a customer
const UpdateCustomerInputSchema = z.object({
  id: z.string().regex(/^\d+$/, "Customer ID must be numeric"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  tags: z.array(z.string()).optional(),
  note: z.string().optional(),
  acceptsMarketing: z.boolean().optional(), // Will be converted to marketingOptInLevel
  taxExempt: z.boolean().optional(),
  metafields: z
    .array(
      z.object({
        id: z.string().optional(),
        namespace: z.string().optional(),
        key: z.string().optional(),
        value: z.string(),
        type: z.string().optional()
      })
    )
    .optional()
});

type UpdateCustomerInput = z.infer<typeof UpdateCustomerInputSchema>;

// Will be initialized in index.ts
let shopifyClient: GraphQLClient;

const updateCustomer = {
  name: "update-customer",
  description: "Update a customer's information",
  schema: UpdateCustomerInputSchema,

  // Add initialize method to set up the GraphQL client
  initialize(client: GraphQLClient) {
    shopifyClient = client;
  },

  execute: async (input: UpdateCustomerInput) => {
    try {
      const { id, acceptsMarketing, ...customerFields } = input;

      // Convert numeric ID to GID format
      const customerGid = `gid://shopify/Customer/${id}`;

      // Prepare the customer input
      const customerInput: any = {
        id: customerGid,
        ...customerFields
      };

      // Convert acceptsMarketing boolean to marketingOptInLevel if provided
      if (acceptsMarketing !== undefined) {
        // If acceptsMarketing is true, use SINGLE_OPT_IN, otherwise use NOT_SUBSCRIBED
        customerInput.marketingOptInLevel = acceptsMarketing ? "SINGLE_OPT_IN" : "NOT_SUBSCRIBED";
      }

      const query = gql`
        mutation customerUpdate($input: CustomerInput!) {
          customerUpdate(input: $input) {
            customer {
              id
              firstName
              lastName
              email
              phone
              tags
              note
              taxExempt
              marketingOptInLevel
              metafields(first: 10) {
                edges {
                  node {
                    id
                    namespace
                    key
                    value
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
        input: customerInput
      };

      const data = (await shopifyClient.request(query, variables)) as {
        customerUpdate: {
          customer: any;
          userErrors: Array<{
            field: string;
            message: string;
          }>;
        };
      };

      // If there are user errors, throw an error
      if (data.customerUpdate.userErrors.length > 0) {
        throw new Error(
          `Failed to update customer: ${data.customerUpdate.userErrors
            .map((e) => `${e.field}: ${e.message}`)
            .join(", ")}`
        );
      }

      // Format and return the updated customer
      const customer = data.customerUpdate.customer;

      // Format metafields if they exist
      const metafields =
        customer.metafields?.edges.map((edge: any) => edge.node) || [];

      // Convert marketingOptInLevel back to acceptsMarketing boolean for backward compatibility
      const customerAcceptsMarketing = customer.marketingOptInLevel === "SINGLE_OPT_IN" || 
                                       customer.marketingOptInLevel === "CONFIRMED_OPT_IN";

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
          acceptsMarketing: customerAcceptsMarketing, // Mapped from marketingOptInLevel
          metafields
        }
      };
    } catch (error) {
      console.error("Error updating customer:", error);
      throw new Error(
        `Failed to update customer: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
};

export { updateCustomer };

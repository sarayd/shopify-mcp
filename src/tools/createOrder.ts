import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";

// Input schema for creating an order
const CreateOrderInputSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().optional(),
  note: z.string().optional(),
  tags: z.array(z.string()).optional(),
  customAttributes: z
    .array(
      z.object({
        key: z.string(),
        value: z.string()
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
    .optional(),
  lineItems: z.array(
    z.object({
      variantId: z.string(),
      quantity: z.number().int().positive(),
      customAttributes: z
        .array(
          z.object({
            key: z.string(),
            value: z.string()
          })
        )
        .optional()
    })
  ),
  billingAddress: z
    .object({
      address1: z.string().optional(),
      address2: z.string().optional(),
      city: z.string().optional(),
      company: z.string().optional(),
      country: z.string().optional(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      phone: z.string().optional(),
      province: z.string().optional(),
      zip: z.string().optional()
    })
    .optional(),
  shippingAddress: z
    .object({
      address1: z.string().optional(),
      address2: z.string().optional(),
      city: z.string().optional(),
      company: z.string().optional(),
      country: z.string().optional(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      phone: z.string().optional(),
      province: z.string().optional(),
      zip: z.string().optional()
    })
    .optional(),
  customerId: z.string().optional(),
  shippingLine: z
    .object({
      title: z.string(),
      price: z.string()
    })
    .optional(),
  taxExempt: z.boolean().optional(),
  presentmentCurrencyCode: z.string().optional()
});

type CreateOrderInput = z.infer<typeof CreateOrderInputSchema>;

// Will be initialized in index.ts
let shopifyClient: GraphQLClient;

const createOrder = {
  name: "create-order",
  description: "Create a new order in Shopify",
  schema: CreateOrderInputSchema,

  // Add initialize method to set up the GraphQL client
  initialize(client: GraphQLClient) {
    shopifyClient = client;
  },

  execute: async (input: CreateOrderInput) => {
    try {
      const query = gql`
        mutation draftOrderCreate($input: DraftOrderInput!) {
          draftOrderCreate(input: $input) {
            draftOrder {
              id
              name
              email
              privateNote
              tags
              totalPrice
              subtotalPrice
              totalShippingPrice
              totalTax
              customer {
                id
                firstName
                lastName
                email
                phone
              }
              shippingAddress {
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
              billingAddress {
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
              lineItems(first: 20) {
                edges {
                  node {
                    id
                    title
                    quantity
                    originalTotal
                    variant {
                      id
                      title
                      sku
                    }
                    customAttributes {
                      key
                      value
                    }
                  }
                }
              }
              customAttributes {
                key
                value
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

      // Convert input to match the DraftOrderInput structure
      const draftOrderInput: any = {
        ...input
      };

      // Map note to privateNote for the API
      if (input.note !== undefined) {
        draftOrderInput.privateNote = input.note;
        delete draftOrderInput.note;
      }

      // Convert customer ID to GID format if provided and not already in GID format
      if (input.customerId) {
        draftOrderInput.customerId = input.customerId.startsWith('gid://') 
          ? input.customerId 
          : `gid://shopify/Customer/${input.customerId}`;
      }

      // Convert variant IDs to GID format in line items if they aren't already
      if (input.lineItems) {
        draftOrderInput.lineItems = input.lineItems.map(item => {
          const variantId = item.variantId.startsWith('gid://') 
            ? item.variantId 
            : `gid://shopify/ProductVariant/${item.variantId}`;
          
          return {
            ...item,
            variantId
          };
        });
      }

      const variables = {
        input: draftOrderInput
      };

      const data = (await shopifyClient.request(query, variables)) as {
        draftOrderCreate: {
          draftOrder: any;
          userErrors: Array<{
            field: string;
            message: string;
          }>;
        };
      };

      // If there are user errors, throw an error
      if (data.draftOrderCreate.userErrors.length > 0) {
        throw new Error(
          `Failed to create order: ${data.draftOrderCreate.userErrors
            .map((e) => `${e.field}: ${e.message}`)
            .join(", ")}`
        );
      }

      // Format and return the created order
      const order = data.draftOrderCreate.draftOrder;

      // Format line items
      const lineItems = order.lineItems.edges.map((lineItemEdge: any) => {
        const lineItem = lineItemEdge.node;
        return {
          id: lineItem.id,
          title: lineItem.title,
          quantity: lineItem.quantity,
          originalTotal: lineItem.originalTotal,
          variant: lineItem.variant
            ? {
                id: lineItem.variant.id,
                title: lineItem.variant.title,
                sku: lineItem.variant.sku
              }
            : null,
          customAttributes: lineItem.customAttributes
        };
      });

      // Format metafields
      const metafields =
        order.metafields?.edges.map((edge: any) => edge.node) || [];

      return {
        order: {
          id: order.id,
          name: order.name,
          email: order.email,
          // Map privateNote back to note for backward compatibility
          note: order.privateNote,
          tags: order.tags,
          totalPrice: order.totalPrice,
          subtotalPrice: order.subtotalPrice,
          totalShippingPrice: order.totalShippingPrice,
          totalTax: order.totalTax,
          customer: order.customer
            ? {
                id: order.customer.id,
                firstName: order.customer.firstName,
                lastName: order.customer.lastName,
                email: order.customer.email,
                phone: order.customer.phone
              }
            : null,
          shippingAddress: order.shippingAddress,
          billingAddress: order.billingAddress,
          lineItems,
          customAttributes: order.customAttributes,
          metafields
        }
      };
    } catch (error) {
      console.error("Error creating order:", error);
      // Provide more specific error messages based on error type
      if (error instanceof Error) {
        // Check for specific API errors and provide more helpful messages
        if (error.message.includes("variant")) {
          throw new Error(`Failed to create order: Invalid product variant. Please check that all variant IDs are correct.`);
        } else if (error.message.includes("customer")) {
          throw new Error(`Failed to create order: Invalid customer ID. Please check the customer ID format.`);
        } else {
          throw new Error(`Failed to create order: ${error.message}`);
        }
      } else {
        throw new Error(`Failed to create order: Unknown error occurred`);
      }
    }
  }
};

export { createOrder };

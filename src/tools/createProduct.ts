import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";

// Input schema for creating a product
const CreateProductInputSchema = z.object({
  title: z.string().min(1, "Title is required"),
  descriptionHtml: z.string().optional(),
  vendor: z.string().optional(),
  productType: z.string().optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(["ACTIVE", "DRAFT", "ARCHIVED"]).default("ACTIVE"),
  options: z
    .array(
      z.object({
        name: z.string().min(1, "Option name is required"),
        values: z.array(z.string()).min(1, "At least one option value is required")
      })
    )
    .optional(),
  variants: z
    .array(
      z.object({
        options: z.array(z.string()),
        price: z.string(),
        sku: z.string().optional(),
        weight: z.number().optional(),
        weightUnit: z.enum(["KILOGRAMS", "GRAMS", "POUNDS", "OUNCES"]).optional(),
        inventoryQuantity: z.number().int().optional(),
        inventoryPolicy: z.enum(["DENY", "CONTINUE"]).optional(),
        inventoryManagement: z.enum(["SHOPIFY", "NOT_MANAGED"]).optional(),
        requiresShipping: z.boolean().optional(),
        taxable: z.boolean().optional(),
        barcode: z.string().optional()
      })
    )
    .optional(),
  images: z
    .array(
      z.object({
        src: z.string().url("Image source must be a valid URL"),
        altText: z.string().optional()
      })
    )
    .optional(),
  seo: z
    .object({
      title: z.string().optional(),
      description: z.string().optional()
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
    .optional(),
  collectionsToJoin: z.array(z.string()).optional(),
  giftCard: z.boolean().optional(),
  taxCode: z.string().optional()
});

type CreateProductInput = z.infer<typeof CreateProductInputSchema>;

// Will be initialized in index.ts
let shopifyClient: GraphQLClient;

const createProduct = {
  name: "create-product",
  description: "Create a new product in Shopify",
  schema: CreateProductInputSchema,

  // Add initialize method to set up the GraphQL client
  initialize(client: GraphQLClient) {
    shopifyClient = client;
  },

  execute: async (input: CreateProductInput) => {
    try {
      // Prepare the mutation input
      const productInput: any = {
        title: input.title,
        status: input.status
      };

      // Add optional fields if provided
      if (input.descriptionHtml) {
        productInput.descriptionHtml = input.descriptionHtml;
      }

      if (input.vendor) {
        productInput.vendor = input.vendor;
      }

      if (input.productType) {
        productInput.productType = input.productType;
      }

      if (input.tags && input.tags.length > 0) {
        productInput.tags = input.tags;
      }

      if (input.options && input.options.length > 0) {
        productInput.options = input.options;
      }

      if (input.seo) {
        productInput.seo = input.seo;
      }

      if (input.giftCard !== undefined) {
        productInput.giftCard = input.giftCard;
      }

      // Handle variants, images, and metafields in separate arrays
      const variantInputs = input.variants?.map(variant => ({
        options: variant.options,
        price: variant.price,
        sku: variant.sku,
        weight: variant.weight,
        weightUnit: variant.weightUnit,
        inventoryQuantities: variant.inventoryQuantity !== undefined ? {
          availableQuantity: variant.inventoryQuantity,
          locationId: "gid://shopify/Location/1" // Default location, can be parameterized if needed
        } : undefined,
        inventoryPolicy: variant.inventoryPolicy,
        inventoryManagement: variant.inventoryManagement,
        requiresShipping: variant.requiresShipping,
        taxable: variant.taxable,
        barcode: variant.barcode
      }));

      const imageInputs = input.images?.map(image => ({
        src: image.src,
        altText: image.altText
      }));

      const metafieldInputs = input.metafields?.map(metafield => ({
        namespace: metafield.namespace,
        key: metafield.key,
        value: metafield.value,
        type: metafield.type
      }));

      const collectionsToJoin = input.collectionsToJoin?.map(
        id => id.startsWith("gid://") ? id : `gid://shopify/Collection/${id}`
      );

      const query = gql`
        mutation productCreate($input: ProductInput!) {
          productCreate(input: $input) {
            product {
              id
              title
              descriptionHtml
              vendor
              productType
              tags
              status
              options {
                id
                name
                position
                values
              }
              variants(first: 20) {
                edges {
                  node {
                    id
                    title
                    price
                    sku
                    weight
                    weightUnit
                    inventoryQuantity
                    inventoryPolicy
                    inventoryManagement
                    requiresShipping
                    taxable
                    barcode
                    selectedOptions {
                      name
                      value
                    }
                  }
                }
              }
              images(first: 20) {
                edges {
                  node {
                    id
                    src
                    altText
                    width
                    height
                  }
                }
              }
              seo {
                title
                description
              }
              metafields(first: 20) {
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
              giftCard
              handle
              createdAt
              updatedAt
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
          ...productInput,
          variants: variantInputs,
          images: imageInputs,
          metafields: metafieldInputs,
          collectionsToJoin
        }
      };

      const data = (await shopifyClient.request(query, variables)) as {
        productCreate: {
          product: any;
          userErrors: Array<{
            field: string;
            message: string;
          }>;
        };
      };

      // If there are user errors, throw an error
      if (data.productCreate.userErrors.length > 0) {
        throw new Error(
          `Failed to create product: ${data.productCreate.userErrors
            .map((e) => `${e.field}: ${e.message}`)
            .join(", ")}`
        );
      }

      // Format and return the created product
      const product = data.productCreate.product;

      // Format variants
      const variants = product.variants.edges.map((variantEdge: any) => {
        const variant = variantEdge.node;
        return {
          id: variant.id,
          title: variant.title,
          price: variant.price,
          sku: variant.sku,
          weight: variant.weight,
          weightUnit: variant.weightUnit,
          inventoryQuantity: variant.inventoryQuantity,
          inventoryPolicy: variant.inventoryPolicy,
          inventoryManagement: variant.inventoryManagement,
          requiresShipping: variant.requiresShipping,
          taxable: variant.taxable,
          barcode: variant.barcode,
          selectedOptions: variant.selectedOptions
        };
      });

      // Format images
      const images = product.images.edges.map((imageEdge: any) => {
        const image = imageEdge.node;
        return {
          id: image.id,
          src: image.src,
          altText: image.altText,
          width: image.width,
          height: image.height
        };
      });

      // Format metafields
      const metafields = product.metafields.edges.map((metafieldEdge: any) => {
        const metafield = metafieldEdge.node;
        return {
          id: metafield.id,
          namespace: metafield.namespace,
          key: metafield.key,
          value: metafield.value,
          type: metafield.type
        };
      });

      return {
        product: {
          id: product.id,
          title: product.title,
          descriptionHtml: product.descriptionHtml,
          vendor: product.vendor,
          productType: product.productType,
          tags: product.tags,
          status: product.status,
          options: product.options,
          variants,
          images,
          seo: product.seo,
          metafields,
          giftCard: product.giftCard,
          handle: product.handle,
          createdAt: product.createdAt,
          updatedAt: product.updatedAt
        }
      };
    } catch (error) {
      console.error("Error creating product:", error);
      throw new Error(
        `Failed to create product: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
};

export { createProduct };

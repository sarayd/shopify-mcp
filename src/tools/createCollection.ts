import type { GraphQLClient } from "graphql-request";
import { gql } from "graphql-request";
import { z } from "zod";

// Input schema for creating a collection
const CreateCollectionInputSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  descriptionHtml: z.string().optional(),
  handle: z.string().optional(),
  isPublished: z.boolean().optional(),
  seo: z
    .object({
      title: z.string().optional(),
      description: z.string().optional()
    })
    .optional(),
  image: z
    .object({
      src: z.string().url("Image source must be a valid URL"),
      altText: z.string().optional()
    })
    .optional(),
  productsToAdd: z.array(z.string()).optional(),
  sortOrder: z
    .enum([
      "MANUAL",
      "BEST_SELLING",
      "ALPHA_ASC",
      "ALPHA_DESC",
      "PRICE_DESC",
      "PRICE_ASC",
      "CREATED",
      "CREATED_DESC"
    ])
    .optional(),
  templateSuffix: z.string().optional(),
  // For automatic collections
  ruleSet: z
    .object({
      rules: z.array(
        z.object({
          column: z.enum([
            "TAG",
            "TITLE",
            "TYPE",
            "VENDOR",
            "VARIANT_PRICE",
            "VARIANT_COMPARE_AT_PRICE",
            "VARIANT_WEIGHT",
            "VARIANT_INVENTORY",
            "VARIANT_TITLE"
          ]),
          relation: z.enum([
            "EQUALS",
            "NOT_EQUALS",
            "GREATER_THAN",
            "LESS_THAN",
            "STARTS_WITH",
            "ENDS_WITH",
            "CONTAINS",
            "NOT_CONTAINS"
          ]),
          condition: z.string()
        })
      ),
      appliedDisjunctively: z.boolean().default(true)
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

type CreateCollectionInput = z.infer<typeof CreateCollectionInputSchema>;

// Define interfaces for the collection response
interface CollectionRule {
  column: string;
  relation: string;
  condition: string;
}

interface CollectionRuleSet {
  rules: CollectionRule[];
  appliedDisjunctively: boolean;
}

interface FormattedCollection {
  id: any;
  title: any;
  description: any;
  descriptionHtml: any;
  handle: any;
  updatedAt: any;
  publishedAt: any;
  seo: any;
  image: any;
  sortOrder: any;
  templateSuffix: any;
  productsCount: any;
  metafields: any;
  ruleSet?: CollectionRuleSet;
}

// Will be initialized in index.ts
let shopifyClient: GraphQLClient;

const createCollection = {
  name: "create-collection",
  description: "Create a new collection in Shopify",
  schema: CreateCollectionInputSchema,

  // Add initialize method to set up the GraphQL client
  initialize(client: GraphQLClient) {
    shopifyClient = client;
  },

  execute: async (input: CreateCollectionInput) => {
    try {
      // Determine if we're creating a custom or automated collection
      const isAutomatedCollection = !!input.ruleSet;
      
      // Base mutation for custom collection
      let query = gql`
        mutation collectionCreate($input: CollectionInput!) {
          collectionCreate(input: $input) {
            collection {
              id
              title
              description
              descriptionHtml
              handle
              updatedAt
              publishedAt
              seo {
                title
                description
              }
              image {
                id
                src
                altText
                width
                height
              }
              sortOrder
              templateSuffix
              productsCount
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

      // For automated collections, use a different mutation
      if (isAutomatedCollection) {
        query = gql`
          mutation collectionCreate($input: CollectionInput!) {
            collectionCreate(input: $input) {
              collection {
                id
                title
                description
                descriptionHtml
                handle
                updatedAt
                publishedAt
                seo {
                  title
                  description
                }
                image {
                  id
                  src
                  altText
                  width
                  height
                }
                sortOrder
                templateSuffix
                productsCount
                ruleSet {
                  rules {
                    column
                    relation
                    condition
                  }
                  appliedDisjunctively
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
      }

      // Prepare the mutation input
      const collectionInput: any = {
        title: input.title
      };

      // Add optional fields if provided
      if (input.description) {
        collectionInput.description = input.description;
      }

      if (input.descriptionHtml) {
        collectionInput.descriptionHtml = input.descriptionHtml;
      }

      if (input.handle) {
        collectionInput.handle = input.handle;
      }

      if (input.isPublished !== undefined) {
        collectionInput.published = input.isPublished;
      }

      if (input.seo) {
        collectionInput.seo = input.seo;
      }

      if (input.image) {
        collectionInput.image = input.image;
      }

      if (input.sortOrder) {
        collectionInput.sortOrder = input.sortOrder;
      }

      if (input.templateSuffix) {
        collectionInput.templateSuffix = input.templateSuffix;
      }

      if (input.ruleSet) {
        collectionInput.ruleSet = input.ruleSet;
      }

      // Convert product IDs to GID format if they aren't already
      if (input.productsToAdd && input.productsToAdd.length > 0) {
        collectionInput.productsToAdd = input.productsToAdd.map(id => 
          id.startsWith('gid://') ? id : `gid://shopify/Product/${id}`
        );
      }

      // Add metafields if provided
      if (input.metafields && input.metafields.length > 0) {
        collectionInput.metafields = input.metafields;
      }

      const variables = {
        input: collectionInput
      };

      const data = (await shopifyClient.request(query, variables)) as {
        collectionCreate: {
          collection: any;
          userErrors: Array<{
            field: string;
            message: string;
          }>;
        };
      };

      // If there are user errors, throw an error
      if (data.collectionCreate.userErrors.length > 0) {
        throw new Error(
          `Failed to create collection: ${data.collectionCreate.userErrors
            .map((e) => `${e.field}: ${e.message}`)
            .join(", ")}`
        );
      }

      // Format and return the created collection
      const collection = data.collectionCreate.collection;

      // Format metafields if they exist
      const metafields =
        collection.metafields?.edges.map((edge: any) => edge.node) || [];

      const formattedCollection: FormattedCollection = {
        id: collection.id,
        title: collection.title,
        description: collection.description,
        descriptionHtml: collection.descriptionHtml,
        handle: collection.handle,
        updatedAt: collection.updatedAt,
        publishedAt: collection.publishedAt,
        seo: collection.seo,
        image: collection.image,
        sortOrder: collection.sortOrder,
        templateSuffix: collection.templateSuffix,
        productsCount: collection.productsCount,
        metafields
      };

      // Add ruleSet for automated collections
      if (isAutomatedCollection && collection.ruleSet) {
        formattedCollection.ruleSet = collection.ruleSet;
      }

      return {
        collection: formattedCollection
      };
    } catch (error) {
      console.error("Error creating collection:", error);
      throw new Error(
        `Failed to create collection: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
};

export { createCollection };

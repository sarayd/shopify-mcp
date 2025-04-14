#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import dotenv from "dotenv";
import { GraphQLClient } from "graphql-request";
import minimist from "minimist";
import { z } from "zod";

// Import tools
import { adjustInventory } from "./tools/adjustInventory.js";
import { connectInventoryToLocation } from "./tools/connectInventoryToLocation.js";
import { createCollection } from "./tools/createCollection.js";
import { createCustomer } from "./tools/createCustomer.js";
import { createFulfillment } from "./tools/createFulfillment.js";
import { createMetafield } from "./tools/createMetafield.js";
import { createOrder } from "./tools/createOrder.js";
import { createProduct } from "./tools/createProduct.js";
import { disconnectInventoryFromLocation } from "./tools/disconnectInventoryFromLocation.js";
import { getCustomerOrders } from "./tools/getCustomerOrders.js";
import { getCustomers } from "./tools/getCustomers.js";
import { getInventoryItems } from "./tools/getInventoryItems.js";
import { getInventoryLevels } from "./tools/getInventoryLevels.js";
import { getLocations } from "./tools/getLocations.js";
import { getOrderById } from "./tools/getOrderById.js";
import { getOrders } from "./tools/getOrders.js";
import { getProductById } from "./tools/getProductById.js";
import { getProducts } from "./tools/getProducts.js";
import { setInventoryTracking } from "./tools/setInventoryTracking.js";
import { updateCustomer } from "./tools/updateCustomer.js";
import { updateOrder } from "./tools/updateOrder.js";

// Parse command line arguments
const argv = minimist(process.argv.slice(2));

// Load environment variables from .env file (if it exists)
dotenv.config();

// Define environment variables - from command line or .env file
const SHOPIFY_ACCESS_TOKEN =
  argv.accessToken || process.env.SHOPIFY_ACCESS_TOKEN;
const MYSHOPIFY_DOMAIN = argv.domain || process.env.MYSHOPIFY_DOMAIN;

// Store in process.env for backwards compatibility
process.env.SHOPIFY_ACCESS_TOKEN = SHOPIFY_ACCESS_TOKEN;
process.env.MYSHOPIFY_DOMAIN = MYSHOPIFY_DOMAIN;

// Validate required environment variables
if (!SHOPIFY_ACCESS_TOKEN) {
  console.error("Error: SHOPIFY_ACCESS_TOKEN is required.");
  console.error("Please provide it via command line argument or .env file.");
  console.error("  Command line: --accessToken=your_token");
  process.exit(1);
}

if (!MYSHOPIFY_DOMAIN) {
  console.error("Error: MYSHOPIFY_DOMAIN is required.");
  console.error("Please provide it via command line argument or .env file.");
  console.error("  Command line: --domain=your-store.myshopify.com");
  process.exit(1);
}

// Create Shopify GraphQL client
const shopifyClient = new GraphQLClient(
  `https://${MYSHOPIFY_DOMAIN}/admin/api/2023-07/graphql.json`,
  {
    headers: {
      "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN,
      "Content-Type": "application/json"
    }
  }
);

// Initialize tools with shopifyClient
getProducts.initialize(shopifyClient);
getProductById.initialize(shopifyClient);
getCustomers.initialize(shopifyClient);
getOrders.initialize(shopifyClient);
getOrderById.initialize(shopifyClient);
updateOrder.initialize(shopifyClient);
getCustomerOrders.initialize(shopifyClient);
updateCustomer.initialize(shopifyClient);
createCustomer.initialize(shopifyClient);
createOrder.initialize(shopifyClient);
createFulfillment.initialize(shopifyClient);
createProduct.initialize(shopifyClient);
createCollection.initialize(shopifyClient);
createMetafield.initialize(shopifyClient);
// Initialize inventory tools
getInventoryLevels.initialize(shopifyClient);
getInventoryItems.initialize(shopifyClient);
getLocations.initialize(shopifyClient);
adjustInventory.initialize(shopifyClient);
setInventoryTracking.initialize(shopifyClient);
connectInventoryToLocation.initialize(shopifyClient);
disconnectInventoryFromLocation.initialize(shopifyClient);

// Set up MCP server
const server = new McpServer({
  name: "shopify",
  version: "1.0.0",
  description:
    "MCP Server for Shopify API, enabling interaction with store data through GraphQL API"
});

// Add tools individually, using their schemas directly
server.tool(
  "get-products",
  {
    searchTitle: z.string().optional(),
    limit: z.number().default(10)
  },
  async (args) => {
    const result = await getProducts.execute(args);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }]
    };
  }
);

server.tool(
  "get-product-by-id",
  {
    productId: z.string().min(1)
  },
  async (args) => {
    const result = await getProductById.execute(args);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }]
    };
  }
);

server.tool(
  "get-customers",
  {
    searchQuery: z.string().optional(),
    limit: z.number().default(10)
  },
  async (args) => {
    const result = await getCustomers.execute(args);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }]
    };
  }
);

server.tool(
  "get-orders",
  {
    status: z.enum(["any", "open", "closed", "cancelled"]).default("any"),
    limit: z.number().default(10)
  },
  async (args) => {
    const result = await getOrders.execute(args);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }]
    };
  }
);

// Add the getOrderById tool
server.tool(
  "get-order-by-id",
  {
    orderId: z.string().min(1)
  },
  async (args) => {
    const result = await getOrderById.execute(args);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }]
    };
  }
);

// Add the updateOrder tool
server.tool(
  "update-order",
  {
    id: z.string().min(1),
    tags: z.array(z.string()).optional(),
    email: z.string().email().optional(),
    note: z.string().optional(),
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
          id: z.string().optional(),
          namespace: z.string().optional(),
          key: z.string().optional(),
          value: z.string(),
          type: z.string().optional()
        })
      )
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
      .optional()
  },
  async (args) => {
    const result = await updateOrder.execute(args);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }]
    };
  }
);

// Add the getCustomerOrders tool
server.tool(
  "get-customer-orders",
  {
    customerId: z
      .string()
      .regex(/^\d+$/, "Customer ID must be numeric")
      .describe("Shopify customer ID, numeric excluding gid prefix"),
    limit: z.number().default(10)
  },
  async (args) => {
    const result = await getCustomerOrders.execute(args);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }]
    };
  }
);

// Add the updateCustomer tool
server.tool(
  "update-customer",
  {
    id: z
      .string()
      .regex(/^\d+$/, "Customer ID must be numeric")
      .describe("Shopify customer ID, numeric excluding gid prefix"),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    tags: z.array(z.string()).optional(),
    note: z.string().optional(),
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
  },
  async (args) => {
    const result = await updateCustomer.execute(args);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }]
    };
  }
);

// Add the createCustomer tool
server.tool(
  "create-customer",
  {
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
      .optional()
  },
  async (args) => {
    const result = await createCustomer.execute(args);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }]
    };
  }
);

// Add the createOrder tool with fixed lineItems validation
server.tool(
  "create-order",
  {
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
    lineItems: z
      .array(
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
      )
      .nonempty("At least one line item is required"),
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
  },
  async (args) => {
    try {
      // Pre-process lineItems to ensure it's an array
      let processedArgs = { ...args };
      
      // Handle case where lineItems might be a string (JSON)
      if (typeof processedArgs.lineItems === 'string') {
        try {
          processedArgs.lineItems = JSON.parse(processedArgs.lineItems);
          
          // Ensure it's an array after parsing
          if (!Array.isArray(processedArgs.lineItems)) {
            processedArgs.lineItems = [processedArgs.lineItems];
          }
        } catch (error) {
          throw new Error("Invalid lineItems format. Expected a valid JSON array.");
        }
      }
      
      // Ensure lineItems is an array
      if (!Array.isArray(processedArgs.lineItems)) {
        throw new Error("lineItems must be an array of product variants with quantities");
      }
      
      // Validate each line item
      processedArgs.lineItems.forEach((item, index) => {
        if (!item.variantId) {
          throw new Error(`Line item at index ${index} is missing variantId`);
        }
        if (!item.quantity || typeof item.quantity !== 'number' || item.quantity <= 0) {
          throw new Error(`Line item at index ${index} has invalid quantity. Must be a positive number.`);
        }
      });
      
      const result = await createOrder.execute(processedArgs);
      return {
        content: [{ type: "text", text: JSON.stringify(result) }]
      };
    } catch (error) {
      throw new Error(`Failed to create order: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
);

// Add the createFulfillment tool
server.tool(
  "create-fulfillment",
  {
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
  },
  async (args) => {
    const result = await createFulfillment.execute(args);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }]
    };
  }
);

// Add the createProduct tool
server.tool(
  "create-product",
  {
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
  },
  async (args) => {
    const result = await createProduct.execute(args);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }]
    };
  }
);

// Add the createCollection tool
server.tool(
  "create-collection",
  {
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
  },
  async (args) => {
    const result = await createCollection.execute(args);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }]
    };
  }
);

// Add the createMetafield tool
server.tool(
  "create-metafield",
  {
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
  },
  async (args) => {
    const result = await createMetafield.execute(args);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }]
    };
  }
);

// Add inventory-related tools

// Add the getInventoryLevels tool
server.tool(
  "get-inventory-levels",
  {
    locationId: z.string().optional(),
    limit: z.number().default(10)
  },
  async (args) => {
    const result = await getInventoryLevels.execute(args);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }]
    };
  }
);

// Add the getInventoryItems tool
server.tool(
  "get-inventory-items",
  {
    query: z.string().optional(),
    productId: z.string().optional(),
    variantId: z.string().optional(),
    limit: z.number().default(10)
  },
  async (args) => {
    const result = await getInventoryItems.execute(args);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }]
    };
  }
);

// Add the getLocations tool
server.tool(
  "get-locations",
  {
    active: z.boolean().optional(),
    limit: z.number().default(10)
  },
  async (args) => {
    const result = await getLocations.execute(args);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }]
    };
  }
);

// Add the adjustInventory tool
server.tool(
  "adjust-inventory",
  {
    inventoryItemId: z.string().min(1, "Inventory item ID is required"),
    availableDelta: z.number().int("Delta must be an integer"),
    locationId: z.string().min(1, "Location ID is required"),
    reason: z.string().optional()
  },
  async (args) => {
    const result = await adjustInventory.execute(args);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }]
    };
  }
);

// Add the setInventoryTracking tool
server.tool(
  "set-inventory-tracking",
  {
    inventoryItemId: z.string().min(1, "Inventory item ID is required"),
    tracked: z.boolean()
  },
  async (args) => {
    const result = await setInventoryTracking.execute(args);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }]
    };
  }
);

// Add the connectInventoryToLocation tool
server.tool(
  "connect-inventory-to-location",
  {
    inventoryItemId: z.string().min(1, "Inventory item ID is required"),
    locationId: z.string().min(1, "Location ID is required"),
    available: z.number().int("Available quantity must be an integer"),
    reason: z.string().optional()
  },
  async (args) => {
    const result = await connectInventoryToLocation.execute(args);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }]
    };
  }
);

// Add the disconnectInventoryFromLocation tool
server.tool(
  "disconnect-inventory-from-location",
  {
    inventoryItemId: z.string().min(1, "Inventory item ID is required"),
    locationId: z.string().min(1, "Location ID is required"),
    reason: z.string().optional()
  },
  async (args) => {
    const result = await disconnectInventoryFromLocation.execute(args);
    return {
      content: [{ type: "text", text: JSON.stringify(result) }]
    };
  }
);

// Start the server
const transport = new StdioServerTransport();
server
  .connect(transport)
  .then(() => {})
  .catch((error: unknown) => {
    console.error("Failed to start Shopify MCP Server:", error);
  });

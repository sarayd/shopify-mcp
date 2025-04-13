# Shopify MCP Server

(please leave a star if you like!)

MCP Server for Shopify API, enabling interaction with store data through GraphQL API. This server provides tools for managing products, customers, orders, and more.

<a href="https://glama.ai/mcp/servers/@GeLi2001/shopify-mcp">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/@GeLi2001/shopify-mcp/badge" alt="Shopify MCP server" />
</a>

## Features

- **Product Management**: Search and retrieve product information
- **Customer Management**: Load customer data and manage customer tags
- **Order Management**: Advanced order querying and filtering
- **GraphQL Integration**: Direct integration with Shopify's GraphQL Admin API
- **Comprehensive Error Handling**: Clear error messages for API and authentication issues

## Prerequisites

1. Node.js (version 16 or higher)
2. Shopify Custom App Access Token (see setup instructions below)

## Setup

### Shopify Access Token

To use this MCP server, you'll need to create a custom app in your Shopify store:

1. From your Shopify admin, go to **Settings** > **Apps and sales channels**
2. Click **Develop apps** (you may need to enable developer preview first)
3. Click **Create an app**
4. Set a name for your app (e.g., "Shopify MCP Server")
5. Click **Configure Admin API scopes**
6. Select the following scopes:
   - `read_products`, `write_products`
   - `read_customers`, `write_customers`
   - `read_orders`, `write_orders`
7. Click **Save**
8. Click **Install app**
9. Click **Install** to give the app access to your store data
10. After installation, you'll see your **Admin API access token**
11. Copy this token - you'll need it for configuration

### Usage with Claude Desktop

Add this to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "shopify": {
      "command": "npx",
      "args": [
        "shopify-mcp",
        "--accessToken",
        "<YOUR_ACCESS_TOKEN>",
        "--domain",
        "<YOUR_SHOP>.myshopify.com"
      ]
    }
  }
}
```

Locations for the Claude Desktop config file:

- MacOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%/Claude/claude_desktop_config.json`

### Alternative: Run Locally with Environment Variables

If you prefer to use environment variables instead of command-line arguments:

1. Create a `.env` file with your Shopify credentials:

   ```
   SHOPIFY_ACCESS_TOKEN=your_access_token
   MYSHOPIFY_DOMAIN=your-store.myshopify.com
   ```

2. Run the server with npx:
   ```
   npx shopify-mcp-server
   ```

### Direct Installation (Optional)

If you want to install the package globally:

```
npm install -g shopify-mcp-server
```

Then run it:

```
shopify-mcp-server --accessToken=<YOUR_ACCESS_TOKEN> --domain=<YOUR_SHOP>.myshopify.com
```

## Available Tools

### Product Management

1. `get-products`

   - Get all products or search by title
   - Inputs:
     - `searchTitle` (optional string): Filter products by title
     - `limit` (number): Maximum number of products to return

2. `get-product-by-id`
   - Get a specific product by ID
   - Inputs:
     - `productId` (string): ID of the product to retrieve

### Customer Management

1. `get-customers`

   - Get customers or search by name/email
   - Inputs:
     - `searchQuery` (optional string): Filter customers by name or email
     - `limit` (optional number, default: 10): Maximum number of customers to return

2. `update-customer`

   - Update a customer's information
   - Inputs:
     - `id` (string, required): Shopify customer ID (numeric ID only, like "6276879810626")
     - `firstName` (string, optional): Customer's first name
     - `lastName` (string, optional): Customer's last name
     - `email` (string, optional): Customer's email address
     - `phone` (string, optional): Customer's phone number
     - `tags` (array of strings, optional): Tags to apply to the customer
     - `note` (string, optional): Note about the customer
     - `taxExempt` (boolean, optional): Whether the customer is exempt from taxes
     - `metafields` (array of objects, optional): Customer metafields for storing additional data

3. `get-customer-orders`

   - Get orders for a specific customer
   - Inputs:
     - `customerId` (string, required): Shopify customer ID (numeric ID only, like "6276879810626")
     - `limit` (optional number, default: 10): Maximum number of orders to return

4. `create-customer`
   - Create a new customer in Shopify
   - Inputs:
     - `email` (string, required): Customer's email address
     - `firstName` (string, optional): Customer's first name
     - `lastName` (string, optional): Customer's last name
     - `phone` (string, optional): Customer's phone number
     - `tags` (array of strings, optional): Tags to apply to the customer
     - `note` (string, optional): Note about the customer
     - `acceptsMarketing` (boolean, optional): Whether the customer accepts marketing emails
     - `taxExempt` (boolean, optional): Whether the customer is exempt from taxes
     - `password` (string, optional): Password for the customer account
     - `passwordConfirmation` (string, optional): Confirmation of the password
     - `addresses` (array of objects, optional): Customer's addresses
     - `metafields` (array of objects, optional): Customer metafields for storing additional data

### Order Management

1. `get-orders`

   - Get orders with optional filtering
   - Inputs:
     - `status` (optional string): Filter by order status
     - `limit` (optional number, default: 10): Maximum number of orders to return

2. `get-order-by-id`

   - Get a specific order by ID
   - Inputs:
     - `orderId` (string, required): Full Shopify order ID (e.g., "gid://shopify/Order/6090960994370")

3. `update-order`

   - Update an existing order with new information
   - Inputs:
     - `id` (string, required): Shopify order ID
     - `tags` (array of strings, optional): New tags for the order
     - `email` (string, optional): Update customer email
     - `note` (string, optional): Order notes
     - `customAttributes` (array of objects, optional): Custom attributes for the order
     - `metafields` (array of objects, optional): Order metafields
     - `shippingAddress` (object, optional): Shipping address information

4. `create-order`

   - Create a new draft order in Shopify
   - Inputs:
     - `lineItems` (array of objects, required): Products to include in the order
       - `variantId` (string, required): ID of the product variant
       - `quantity` (number, required): Quantity of the product
       - `customAttributes` (array of objects, optional): Custom attributes for the line item
     - `email` (string, optional): Customer email
     - `phone` (string, optional): Customer phone number
     - `note` (string, optional): Order notes
     - `tags` (array of strings, optional): Tags for the order
     - `customAttributes` (array of objects, optional): Custom attributes for the order
     - `metafields` (array of objects, optional): Order metafields
     - `billingAddress` (object, optional): Billing address information
     - `shippingAddress` (object, optional): Shipping address information
     - `customerId` (string, optional): ID of an existing customer
     - `shippingLine` (object, optional): Shipping method and price
     - `taxExempt` (boolean, optional): Whether the order is exempt from taxes
     - `presentmentCurrencyCode` (string, optional): Currency code for the order

5. `create-fulfillment`
   - Create a new fulfillment for an order in Shopify
   - Inputs:
     - `orderId` (string, required): ID of the order to fulfill
     - `notifyCustomer` (boolean, default: true): Whether to notify the customer about the fulfillment
     - `trackingInfo` (object, optional): Tracking information
       - `number` (string, optional): Tracking number
       - `url` (string, optional): Tracking URL
       - `company` (string, optional): Shipping company
     - `lineItems` (array of objects, optional): Specific line items to fulfill
       - `id` (string, required): ID of the line item
       - `quantity` (number, required): Quantity to fulfill
     - `locationId` (string, optional): ID of the location fulfilling the order
     - `trackingNumbers` (array of strings, optional): Multiple tracking numbers
     - `trackingUrls` (array of strings, optional): Multiple tracking URLs
     - `metadata` (object, optional): Additional metadata for the fulfillment

## Debugging

If you encounter issues, check Claude Desktop's MCP logs:

```
tail -n 20 -f ~/Library/Logs/Claude/mcp*.log
```

## License

MIT

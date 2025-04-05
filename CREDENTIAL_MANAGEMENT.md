# Credential Management

This document outlines the credential management system implemented in the anime chat application.

## Overview

The application has been updated to securely manage credentials for external services like PayPal and email SMTP. Instead of hardcoding credentials in source code or configuration files, all sensitive credentials are now stored in the `data/admin.db` database.

## Key Benefits

- Improved security by removing hardcoded credentials from source code
- Centralized credential management
- Easier credential rotation
- Support for different environments (production vs. sandbox)
- Backwards compatibility with environment variables

## Credentials Currently Managed

| Service | Description |
|---------|-------------|
| PAYPAL_SANDBOX_CLIENT_ID | PayPal Sandbox Client ID for testing |
| PAYPAL_SANDBOX_CLIENT_SECRET | PayPal Sandbox Client Secret for testing |
| PAYPAL_PRODUCTION_CLIENT_ID | PayPal Production Client ID for live payments |
| PAYPAL_PRODUCTION_CLIENT_SECRET | PayPal Production Client Secret for live payments |
| SMTP_USER | Email SMTP username/email for sending emails |
| SMTP_PASSWORD | Email SMTP password for sending emails |
| SMTP_HOST | Email SMTP host server (default: smtp.gmail.com) |
| SMTP_PORT | Email SMTP port (default: 587) |
| GITHUB_TOKEN | GitHub token used for Azure AI services authentication |

## Credential Precedence

The system follows this precedence when loading credentials:

1. Check the database first (admin.db)
2. If not found in database, check environment variables
3. As a last resort, fall back to default values (when applicable)

This ensures backward compatibility while encouraging the use of the database for credential storage.

## Utility Scripts

### Migrate Credentials

To migrate credentials from environment variables or hardcoded values to the database:

```
node migrate-credentials.cjs
```

### Manage Credentials

A simple CLI tool to view, add, update or delete credentials:

```
node manage-credentials.cjs
```

This tool allows you to:
- View all stored credentials (with masked values)
- Add new credentials
- Update existing credentials
- Delete credentials

## For Developers

When adding new services that require credentials:

1. Use the `getApiKey` function from `server/admin-db.ts` to retrieve credentials
2. Add a fallback to environment variables for backward compatibility
3. Document the new credential in this file
4. Update the migration script if needed

Example usage:

```typescript
import { getApiKey } from "./admin-db";

async function someFunction() {
  // Get the API key from the database
  const apiKey = await getApiKey("SERVICE_NAME") || process.env.SERVICE_NAME;
  
  // Use the API key
  // ...
}
```

## Security Considerations

- Database file should have restricted permissions
- Credentials should never be logged or exposed in responses
- Production credentials should only be used in production environments
- Regular credential rotation is recommended
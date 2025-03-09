# Setting up PayPal Credentials

To set up your PayPal credentials, follow these steps:

1. Create or edit the `.env` file in your project root directory
2. Add these lines to your `.env` file:
```
PAYPAL_CLIENT_ID=your_client_id_here
PAYPAL_SECRET=your_secret_key_here
```

Replace `your_client_id_here` and `your_secret_key_here` with your actual PayPal API credentials.

## How to Get PayPal Credentials

1. Go to the PayPal Developer Dashboard (https://developer.paypal.com/dashboard)
2. Log in with your PayPal account
3. Click on "Apps & Credentials"
4. Create a new app or select an existing one
5. Copy the following credentials:
   - Client ID: This is shown directly on the page
   - Secret: Click "Show" to reveal it

## Testing Your Setup

1. After adding your credentials to the `.env` file
2. Restart the application
3. Go to the subscription page
4. You should see the PayPal payment button
5. The payment button should be clickable and show PayPal's payment interface

## Troubleshooting

If the PayPal button doesn't appear:
1. Check that your `.env` file is in the correct location (project root)
2. Verify that the credentials are copied correctly with no extra spaces
3. Make sure to restart the application after adding the credentials

Important: Never commit the `.env` file to version control. Make sure it's listed in your `.gitignore` file.
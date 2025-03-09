import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { PayPalScriptProvider } from "@paypal/react-paypal-js";

// PayPal initial options
const paypalInitialOptions = {
  clientId: import.meta.env.VITE_PAYPAL_CLIENT_ID as string,
  currency: "USD",
  intent: "capture"
};

createRoot(document.getElementById("root")!).render(
  <PayPalScriptProvider options={paypalInitialOptions}>
    <App />
  </PayPalScriptProvider>
);

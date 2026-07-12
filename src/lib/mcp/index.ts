import { defineMcp, auth } from "@lovable.dev/mcp-js";
import trackBooking from "./tools/track-booking";
import listServices from "./tools/list-services";
import listVendors from "./tools/list-vendors";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

export default defineMcp({
  name: "mfn-mcp",
  title: "MFN — Medical Field Nation",
  version: "0.1.0",
  instructions:
    "Authenticated read-only tools for the MFN medical home-care platform. Use `track_booking` to check a booking's status by number, `list_services` to browse offered home-care services, and `list_marketplace_vendors` to browse pharmacies and medical stores in the Medical Marketplace.",
  // Require a valid Supabase-issued OAuth access token on every MCP call so the
  // server is not open to anonymous callers once published.
  auth: auth.oauth.issuer({
    issuer: `${SUPABASE_URL}/auth/v1`,
    acceptedAudiences: "authenticated",
    resourceName: "MFN MCP",
  }),
  tools: [trackBooking, listServices, listVendors],
});

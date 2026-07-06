import { defineMcp } from "@lovable.dev/mcp-js";
import trackBooking from "./tools/track-booking";
import listServices from "./tools/list-services";
import listVendors from "./tools/list-vendors";

export default defineMcp({
  name: "mfn-mcp",
  title: "MFN — Medical Field Nation",
  version: "0.1.0",
  instructions:
    "Public read-only tools for the MFN medical home-care platform. Use `track_booking` to check a booking's status by number, `list_services` to browse offered home-care services, and `list_marketplace_vendors` to browse pharmacies and medical stores in the Medical Marketplace.",
  tools: [trackBooking, listServices, listVendors],
});

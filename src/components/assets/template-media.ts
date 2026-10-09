import type * as D from "@/types/domain";

/** Representative photography per template, used where no asset exists yet (structuring wizard). */
export const TEMPLATE_COVER: Record<D.AssetTemplate, string> = {
  "real-estate": "/media/assets/wpk-cover.webp",
  "private-credit": "/media/assets/acred-cover.webp",
  "treasury-fund": "/media/assets/tbill-cover.webp",
  bond: "/media/assets/bond28-cover.webp",
  sukuk: "/media/assets/ads-cover.webp",
  "private-equity": "/media/assets/hlpaf-cover.webp",
  commodity: "/media/assets/gold-cover.webp",
  receivables: "/media/assets/lrp-cover.webp",
  "spv-shares": "/media/assets/bbr-cover.webp",
  infrastructure: "/media/assets/mbr6-cover.webp",
};

/** Short benefit line for a product, used as an editorial headline on investor pages. */
export function benefitLine(a: Pick<D.Asset, "template" | "visual">): string {
  switch (a.template) {
    case "real-estate":
      return "Earn rental income from real property";
    case "treasury-fund":
      return "Park cash in short-dated treasuries";
    case "commodity":
      return "Hold allocated gold, one gram at a time";
    case "private-credit":
      return "Earn interest from diversified private credit";
    case "bond":
      return "Lock in a fixed coupon to maturity";
    case "sukuk":
      return "Sharia-compliant income from clean energy";
    case "private-equity":
      return "Own a slice of global private markets";
    case "receivables":
      return "Short-dated income from trade receivables";
    case "spv-shares":
      return "Own shares in a property company from AED 2,000";
    case "infrastructure":
      return "Contracted income from clean energy";
  }
}

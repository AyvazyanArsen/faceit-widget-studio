// SHARED TEMPLATES — visible to every visitor of the deployed site.
//
// To publish a template globally:
//   1. In the deployed studio, build the template you want and click "Publish"
//      in the admin template list. A JS snippet will be copied to your clipboard.
//   2. Paste it into the SHARED_TEMPLATES array below.
//   3. Commit and push. Vercel will auto-deploy in ~60 seconds and every visitor
//      will see the new template.
//
// Templates added here:
//   - Are read-only (no edit/delete buttons in the UI)
//   - Show a "SHARED" badge to distinguish them from per-browser custom templates
//   - Should use absolute CDN URLs for mp4Url (blob: URLs won't work for other users)
//
// Schema reference:
//   {
//     id: "tpl-shared-something",        // must be unique, prefix with tpl-shared-
//     name: "Display Name",
//     design: "neon" | "brutal" | "anime" | "pixel",
//     category: "Cyberpunk" | "Gaming" | "Minimal" | "Custom",
//     defaultAccent: "#hexcolor",
//     defaultFont: "" | "Orbitron" | ...   // any value from GOOGLE_FONTS
//     mp4Url: "" | "https://cdn.example.com/loop.mp4",
//     price: 0,                          // 0 = free; >0 = paywalled
//     desc: "Short tagline",
//   }

export const SHARED_TEMPLATES = [
  // Example (uncomment to test):
  // {
  //   id: "tpl-shared-cyber-city",
  //   name: "Cyber City",
  //   design: "neon",
  //   category: "Cyberpunk",
  //   defaultAccent: "#00ffea",
  //   defaultFont: "Orbitron",
  //   mp4Url: "",
  //   price: 0,
  //   desc: "Synthwave skyline · default cyberpunk vibe",
  // },
];

export const tenantConfig = {
  id: "omdivyadarshan",
  name: "OMDivyaDarshan",
  domain: "app.omdivyadarshan.org",
  modules: {
    products: true,
    services: true,
    asthiVisarjan: true,
    puja: true,
    kundli: true,
    membership: true,
    vendors: true,
    capacity: true,
    wallet: false
  },
  theme: {
    palette: {
      deepBrown: "#2f1c14",
      saffron: "#d97706",
      templeGold: "#c89b3c",
      ivoryCream: "#fff8ec",
      sand: "#ead9bd",
      mutedBrown: "#7b6656",
      successGreen: "#2e7d4f",
      errorRed: "#b42318",
      opsBlue: "#2563eb"
    }
  }
} as const;

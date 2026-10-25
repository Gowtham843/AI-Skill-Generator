const nextConfig = {
  output: "standalone",
  env: {
    DATABASE_URL: process.env.DATABASE_URL,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  },
  webpack: (config, { isServer }) => {
    config.externals = config.externals || [];
    if (isServer) {
      config.externals.push("pino");
    }
    return config;
  },
};

module.exports = nextConfig;

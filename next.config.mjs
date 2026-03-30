/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  // Only needed if hosting at https://<user>.github.io/<repo-name>/
  // Omit both if using a custom domain or a <user>.github.io root repo
  basePath: '/personal_site',
  assetPrefix: '/personal_site/',
};


export default nextConfig;

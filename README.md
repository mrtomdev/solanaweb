# Solana Coin Creator / Deployer

Production-focused static website for creating and deploying SPL tokens from Phantom wallet.

## Features
- Token name, symbol, decimals, and initial supply
- Optional metadata URI field for your off-chain token metadata JSON
- Mint authority and freeze authority controls
- Option to revoke mint authority and disable freeze authority
- Upload coin image and banner preview
- Social links and description fields
- Download metadata JSON template

## Hostinger Mainnet Deployment
1. Upload `index.html`, `styles.css`, and `app.js` to `public_html`.
2. Enable SSL in Hostinger and always use `https://your-domain` (wallet providers block insecure contexts).
3. Open the site, connect Phantom, and keep network on **Mainnet** for production deployments.
4. For your token metadata URI, host JSON/images on IPFS or Arweave and paste the final metadata URL.

## Local Preview
```bash
python3 -m http.server 4173
```
Then open `http://localhost:4173`.

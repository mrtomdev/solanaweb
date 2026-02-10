# Solana Coin Creator / Deployer

Simple static website for creating and deploying SPL tokens from Phantom wallet.

## Features
- Token name, symbol, decimals, and initial supply
- Optional metadata URI (Metaplex metadata account creation)
- Mint authority and freeze authority controls
- Option to revoke mint authority and disable freeze authority
- Upload coin image and banner preview
- Social links and description fields
- Download metadata JSON template

## Hostinger Deployment
1. Upload `index.html`, `styles.css`, and `app.js` to `public_html`.
2. Open your domain and connect Phantom.
3. Use **Devnet** first for testing, then switch to **Mainnet**.

## Local Preview
```bash
python -m http.server 4173
```
Then open `http://localhost:4173`.

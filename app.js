import {
  clusterApiUrl,
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
} from "https://esm.sh/@solana/web3.js@1.95.3";
import {
  AuthorityType,
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  createInitializeMintInstruction,
  createMintToInstruction,
  createSetAuthorityInstruction,
  getAssociatedTokenAddress,
  getMinimumBalanceForRentExemptMint,
} from "https://esm.sh/@solana/spl-token@0.4.8";
import {
  PROGRAM_ID as TOKEN_METADATA_PROGRAM_ID,
  createCreateMetadataAccountV3Instruction,
} from "https://esm.sh/@metaplex-foundation/mpl-token-metadata@3.4.0";

const el = (id) => document.getElementById(id);
const state = {
  wallet: null,
  publicKey: null,
  imageData: null,
  bannerData: null,
};

const connectBtn = el("connectWalletBtn");
const deployBtn = el("deployBtn");
const downloadMetaBtn = el("downloadMetaBtn");

const setStatus = (message) => (el("deployStatus").textContent = message);

const showFilePreview = async (inputId, imgId, stateKey) => {
  const file = el(inputId).files?.[0];
  if (!file) return;
  const dataUrl = await new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
  state[stateKey] = dataUrl;
  const img = el(imgId);
  img.src = dataUrl;
  img.hidden = false;
};

el("coinImage").addEventListener("change", () => showFilePreview("coinImage", "coinPreview", "imageData"));
el("bannerImage").addEventListener("change", () => showFilePreview("bannerImage", "bannerPreview", "bannerData"));

connectBtn.addEventListener("click", async () => {
  try {
    if (!window.solana?.isPhantom) {
      alert("Install Phantom wallet extension first.");
      return;
    }
    const resp = await window.solana.connect();
    state.wallet = window.solana;
    state.publicKey = resp.publicKey;
    el("walletStatus").textContent = `Connected: ${resp.publicKey.toBase58()}`;
  } catch (err) {
    el("walletStatus").textContent = `Connection failed: ${err.message}`;
  }
});

const parseOptionalPubkey = (value, fallback) => {
  if (!value?.trim()) return fallback;
  return new PublicKey(value.trim());
};

const collectFormValues = () => {
  const values = {
    name: el("name").value.trim(),
    symbol: el("symbol").value.trim(),
    decimals: Number(el("decimals").value || 0),
    supply: Number(el("supply").value || 0),
    metadataUri: el("metadataUri").value.trim(),
    description: el("description").value.trim(),
    website: el("website").value.trim(),
    twitter: el("twitter").value.trim(),
    telegram: el("telegram").value.trim(),
    discord: el("discord").value.trim(),
    disableFreeze: el("disableFreeze").checked,
    revokeMint: el("revokeMint").checked,
  };
  if (!values.name || !values.symbol) throw new Error("Token name and symbol are required.");
  return values;
};

const buildMetadataJson = (values) => ({
  name: values.name,
  symbol: values.symbol,
  description: values.description,
  image: state.imageData || "",
  extensions: {
    website: values.website,
    twitter: values.twitter,
    telegram: values.telegram,
    discord: values.discord,
    banner: state.bannerData || "",
  },
});

downloadMetaBtn.addEventListener("click", () => {
  try {
    const values = collectFormValues();
    const metadata = buildMetadataJson(values);
    const blob = new Blob([JSON.stringify(metadata, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${values.symbol || "token"}-metadata.json`;
    a.click();
    URL.revokeObjectURL(url);
    setStatus("Metadata JSON downloaded.");
  } catch (err) {
    setStatus(err.message);
  }
});

deployBtn.addEventListener("click", async () => {
  if (!state.wallet || !state.publicKey) {
    setStatus("Connect wallet before deploying.");
    return;
  }

  try {
    const values = collectFormValues();
    const network = el("networkSelect").value;
    const connection = new Connection(clusterApiUrl(network), "confirmed");

    const payer = state.publicKey;
    const mintKeypair = Keypair.generate();
    const lamports = await getMinimumBalanceForRentExemptMint(connection);
    const mintAuthority = parseOptionalPubkey(el("mintAuthority").value, payer);
    const freezeAuthority = values.disableFreeze
      ? null
      : parseOptionalPubkey(el("freezeAuthority").value, payer);

    const ata = await getAssociatedTokenAddress(mintKeypair.publicKey, payer);
    const tx = new Transaction();

    tx.add(
      SystemProgram.createAccount({
        fromPubkey: payer,
        newAccountPubkey: mintKeypair.publicKey,
        space: MINT_SIZE,
        lamports,
        programId: TOKEN_PROGRAM_ID,
      }),
      createInitializeMintInstruction(
        mintKeypair.publicKey,
        values.decimals,
        mintAuthority,
        freezeAuthority,
        TOKEN_PROGRAM_ID,
      ),
      createAssociatedTokenAccountInstruction(payer, ata, payer, mintKeypair.publicKey),
    );

    if (values.supply > 0) {
      const rawSupply = BigInt(Math.round(values.supply * 10 ** values.decimals));
      tx.add(createMintToInstruction(mintKeypair.publicKey, ata, mintAuthority, rawSupply));
    }

    if (values.metadataUri) {
      const [metadataPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("metadata"), TOKEN_METADATA_PROGRAM_ID.toBuffer(), mintKeypair.publicKey.toBuffer()],
        TOKEN_METADATA_PROGRAM_ID,
      );

      tx.add(
        createCreateMetadataAccountV3Instruction(
          {
            metadata: metadataPda,
            mint: mintKeypair.publicKey,
            mintAuthority,
            payer,
            updateAuthority: payer,
          },
          {
            createMetadataAccountArgsV3: {
              data: {
                name: values.name,
                symbol: values.symbol,
                uri: values.metadataUri,
                sellerFeeBasisPoints: 0,
                creators: null,
                collection: null,
                uses: null,
              },
              isMutable: true,
              collectionDetails: null,
            },
          },
        ),
      );
    }

    if (values.revokeMint) {
      tx.add(createSetAuthorityInstruction(mintKeypair.publicKey, mintAuthority, AuthorityType.MintTokens, null));
    }
    if (values.disableFreeze) {
      tx.add(createSetAuthorityInstruction(mintKeypair.publicKey, payer, AuthorityType.FreezeAccount, null));
    }

    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
    tx.feePayer = payer;
    tx.recentBlockhash = blockhash;
    tx.partialSign(mintKeypair);

    const signed = await state.wallet.signTransaction(tx);
    const signature = await connection.sendRawTransaction(signed.serialize());
    await connection.confirmTransaction({ blockhash, lastValidBlockHeight, signature }, "confirmed");

    el("mintAddress").textContent = mintKeypair.publicKey.toBase58();
    el("txLink").href = `https://explorer.solana.com/tx/${signature}?cluster=${network}`;
    el("result").hidden = false;
    setStatus(`Success. Mint created with tx: ${signature}`);
  } catch (err) {
    console.error(err);
    setStatus(`Deployment failed: ${err.message}`);
  }
});

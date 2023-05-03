import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { NftMinter } from "../target/types/nft_minter";

const TOKEN_METADATA_PROGRAM_ID = new anchor.web3.PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
);
const METADATA_PREFIX = "metadata";
const EDITION = "edition";

export const findMetadataAddress = ({
  mint,
}: {
  mint: anchor.web3.PublicKey;
}): [anchor.web3.PublicKey, number] =>
  anchor.web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from(METADATA_PREFIX),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
    ],
    TOKEN_METADATA_PROGRAM_ID
  );

export const findEditionAddress = ({
  mint,
}: {
  mint: anchor.web3.PublicKey;
}): [anchor.web3.PublicKey, number] =>
  anchor.web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from(METADATA_PREFIX),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
      Buffer.from(EDITION),
    ],
    TOKEN_METADATA_PROGRAM_ID
  );

describe("nft_minter", async () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const payer = provider.wallet as anchor.Wallet;

  const nftMinterProgram = anchor.workspace.NftMinter as Program<NftMinter>;

  it("Test User Flow", async () => {
    const resourceMintKeypair = anchor.web3.Keypair.generate();

    const name = "Solana Course NFT";
    const symbol = "SOLC";
    const uri =
      "https://raw.githubusercontent.com/arsenijkovalov/nft-minter/main/nft_minter/assets/nft.json";
    const creators = [
      {
        address: payer.publicKey,
        share: 100,
        verified: false,
      },
    ];
    const sellerFeeBasisPoints = 100;
    const is_mutable = true;

    const [metadata] = findMetadataAddress({
      mint: resourceMintKeypair.publicKey,
    });

    // Create Token
    try {
      const tx = await nftMinterProgram.methods
        .createToken(
          name,
          symbol,
          uri,
          creators,
          sellerFeeBasisPoints,
          is_mutable
        )
        .accounts({
          payer: payer.publicKey,
          mintAccount: resourceMintKeypair.publicKey,
          mintAuthority: payer.publicKey,
          updateAuthority: payer.publicKey,
          metadataAccount: metadata,
          tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
        })
        .signers([resourceMintKeypair, payer.payer])
        .rpc();
      console.log("Transaction [Create Token]", tx);
    } catch (error) {
      console.log(error);
    }

    const [masterEdition, masterEditionBump] = findEditionAddress({
      mint: resourceMintKeypair.publicKey,
    });

    const maxSupply = 1;

    const resourceToken = anchor.utils.token.associatedAddress({
      mint: resourceMintKeypair.publicKey,
      owner: payer.publicKey,
    });

    // Mint Token
    try {
      const tx = await nftMinterProgram.methods
        .mintToken(new BN(maxSupply))
        .accounts({
          payer: payer.publicKey,
          mintAccount: resourceMintKeypair.publicKey,
          mintAuthority: payer.publicKey,
          updateAuthority: payer.publicKey,
          associatedTokenAccount: resourceToken,
          metadataAccount: metadata,
          editionAccount: masterEdition,
          tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
        })
        .signers([resourceMintKeypair, payer.payer])
        .rpc();
      console.log("Transaction [Mint Token]", tx);
    } catch (error) {
      console.log(error);
    }
  });
});

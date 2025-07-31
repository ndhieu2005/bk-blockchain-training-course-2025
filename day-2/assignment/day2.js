const {
    Connection,
    Keypair,
    LAMPORTS_PER_SOL,
    clusterApiUrl,
    PublicKey,
    Transaction,
    sendAndConfirmTransaction,
    SystemProgram,
} = require("@solana/web3.js");
const {
    createMint,
    getOrCreateAssociatedTokenAccount,
    mintTo,
    setAuthority,
    AuthorityType,
} = require("@solana/spl-token");
const {
    Metaplex,
    keypairIdentity,
    bundlrStorage,
    toMetaplexFile,
} = require("@metaplex-foundation/js");
const fs = require("fs");

// Load payer from local keypair (replace with your own or use Keypair.generate())
const payer = Keypair.generate();
const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

// Airdrop SOL for payer if needed
(async () => {
    let balance = await connection.getBalance(payer.publicKey);
    if (balance < 2 * LAMPORTS_PER_SOL) {
        const sig = await connection.requestAirdrop(payer.publicKey, 2 * LAMPORTS_PER_SOL);
        await connection.confirmTransaction(sig);
        console.log("Airdrop complete.");
    }

    // 1. Mint Fungible Token (FT)
    const decimals = 6;
    const tokenMint = await createMint(
        connection,
        payer,
        payer.publicKey,
        null,
        decimals
    );
    console.log("Fungible Token Mint Address:", tokenMint.toBase58());

    // Create ATA for payer and recipient
    const payerTokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        payer,
        tokenMint,
        payer.publicKey
    );
    const recipient = new PublicKey("63EEC9FfGyksm7PkVC6z8uAmqozbQcTzbkWJNsgqjkFs");
    const recipientTokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        payer,
        tokenMint,
        recipient
    );

    // Mint tokens in a single transaction
    const { createMintToInstruction } = require("@solana/spl-token");

    const tx = new Transaction();
    tx.add(
        createMintToInstruction(
            tokenMint,
            payerTokenAccount.address,
            payer.publicKey,
            100 * 10 ** decimals
        ),
        createMintToInstruction(
            tokenMint,
            recipientTokenAccount.address,
            payer.publicKey,
            10 * 10 ** decimals
        )
    );
    const sig1 = await sendAndConfirmTransaction(connection, tx, [payer]);
    console.log("Mint FT transaction signature:", sig1);

    // 2. Mint NFT using Metaplex JS SDK
    const metaplex = Metaplex.make(connection)
        .use(keypairIdentity(payer));
    const { nft, response } = await metaplex.nfts().create({
        uri: "https://arweave.net/your-nft-metadata.json", // Replace with your uploaded metadata URI
        name: "My NFT",
        symbol: "MYNFT",
        sellerFeeBasisPoints: 1000, // 10% royalty
        creators: [
            { address: payer.publicKey, share: 100 }
        ],
        isMutable: true,
        maxSupply: 1,
    });
    console.log("NFT Mint Address:", nft.address.toBase58());
    console.log("NFT Transaction Signature:", response.signature);

    // Gợi ý: Để upload metadata và image lên Arweave, bạn có thể dùng metaplex.storage().upload
    // hoặc upload thủ công rồi lấy link dán vào trường uri ở trên.

    // In ra địa chỉ các mint và signature
    console.log("FT Mint:", tokenMint.toBase58());
    console.log("NFT Mint:", nft.address.toBase58());
    console.log("FT Transaction Signature:", sig1);
    console.log("NFT Transaction Signature:", response.signature);
})();
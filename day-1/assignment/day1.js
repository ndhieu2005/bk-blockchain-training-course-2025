const fs = require("fs");
const bs58 = require("bs58");
const {
    Connection,
    clusterApiUrl,
    Keypair,
    LAMPORTS_PER_SOL,
    SystemProgram,
    Transaction,
    sendAndConfirmTransaction,
    PublicKey
} = require("@solana/web3.js");

(async () => {
    // Tạo tài khoản payer ngẫu nhiên
    const payer = Keypair.generate();

    // Tạo connection đến Devnet
    const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

    console.log("Generated payer:", payer.publicKey.toBase58());

    // Vì payer được tạo ngẫu nhiên, nên cần airdrop để có SOL thực hiện giao dịch
    let airdropSig = await connection.requestAirdrop(payer.publicKey, 2 * LAMPORTS_PER_SOL);
    await connection.confirmTransaction(airdropSig);
    console.log("Airdrop complete.");

    // Tạo account mới, funded bằng 1 SOL
    const newAccount = Keypair.generate();
    const initialLamports = LAMPORTS_PER_SOL; // 1 SOL
    const createAccountIx = SystemProgram.createAccount({
        fromPubkey: payer.publicKey,
        newAccountPubkey: newAccount.publicKey,
        lamports: initialLamports,
        space: 0,
        programId: SystemProgram.programId,
    });

    // Instruction: chuyển 0.1 SOL từ newAccount tới account đích
    const recipientPubkey = new PublicKey("63EEC9FfGyksm7PkVC6z8uAmqozbQcTzbkWJNsgqjkFs");
    const transferIx = SystemProgram.transfer({
        fromPubkey: newAccount.publicKey,
        toPubkey: recipientPubkey,
        lamports: 0.1 * LAMPORTS_PER_SOL,
    });

    // Instruction: "đóng" account bằng cách chuyển toàn bộ số dư còn lại (0.9 SOL) về payer
    const closeAccountIx = SystemProgram.transfer({
        fromPubkey: newAccount.publicKey,
        toPubkey: payer.publicKey,
        lamports: initialLamports - 0.1 * LAMPORTS_PER_SOL,
    });

    // Tạo transaction, thêm các instruction theo thứ tự
    const transaction = new Transaction().add(
        createAccountIx,
        transferIx,
        closeAccountIx
    );
    transaction.feePayer = payer.publicKey;

    // Gửi transaction, các signer cần ký là payer và newAccount
    const signature = await sendAndConfirmTransaction(
        connection,
        transaction,
        [payer, newAccount]
    );

    console.log("Transaction signature:", signature);
})();
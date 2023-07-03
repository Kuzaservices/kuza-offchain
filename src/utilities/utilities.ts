import { Address, Datum, Lucid, TxComplete, TxHash, UTxO } from "lucid-cardano";

export const signAndSubmitTx = async (tx: TxComplete): Promise<TxHash> => {
    const signedTx = await tx.sign().complete();
    const txHash = await signedTx.submit();
    console.log(`Transaction submitted: ${txHash}`);
    alert(`Transaction submitted: ${txHash}`);
    return txHash;
};

export const safeStringToBigInt = (r: string): bigint | undefined => {
    const parsed = BigInt(Number(r));
    if (Number.isNaN(parsed)) return;
    return parsed;
};

export const findUTxO = async (lucid: Lucid, ref: string) => {
    const [txH, ix] = ref.split("#");
    const utxos = await lucid.utxosByOutRef([
        {
            txHash: txH,
            outputIndex: Number(ix),
        },
    ]);
    return utxos[0];
};

export const findDatumUTxoAtAtScript = async (lucid: Lucid, address: Address, datum: Datum): Promise<UTxO> => {
    const projectUtxOs = await lucid.utxosAt(address).catch((err) => {
        console.log("Can't find Oracle UtxO");
    });

    if (!projectUtxOs) return;
    const datumUtxos :  UTxO[] = await projectUtxOs.filter((utxo) => utxo.datum == datum)

    return await datumUtxos[0]
}
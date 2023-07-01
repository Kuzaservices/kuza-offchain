import {
    Address,
    Blockfrost,
    Lucid,
    MintingPolicy,
    PolicyId,
    ScriptHash,
    SpendingValidator,
    TxHash,
    UTxO,
    Unit,
} from "lucid-cardano";
import type { AppProps } from "next/app";
import {
    Dispatch,
    SetStateAction,
    createContext,
    useEffect,
    useState,
} from "react";


const projectScript: SpendingValidator = {
    type: "PlutusV2",
    script:
    ""
};


export type AppState = {
    // Global
    lucid?: Lucid;
    wAddr?: Address;

    // Project Script
    projectScript: SpendingValidator;
    projectScriptHash?: ScriptHash;
    projectAddress?: Address;

    // Project Tokens
    projectCreatorAssetClassHex?: Unit;
    projectCreatorTokPolicyIdHex?: PolicyId;
    projectCreatorTokTokenNameHex?: string;
    projectCreatorTokPolicy?: MintingPolicy;
    projectWithNftUTxO?: UTxO;
    projectUtxoWithNFTRef?: string;
}

const initialAppState: AppState = {
    projectScript: projectScript,
};

export const AppStateContext = createContext<{
    appState: AppState;
    setAppState: Dispatch<SetStateAction<AppState>>;
}>({ appState: initialAppState, setAppState: () => {} });

export default function App({ Component, pageProps }: AppProps) {
    const [appState, setAppState] = useState<AppState>(initialAppState);

    const connectLucidAndNami = async () => {
        const lucid = await Lucid.new(
            new Blockfrost(
                "https://cardano-preprod.blockfrost.io/api/v0",
                "preprodTbSEZ0iFYFDBzZEvzNvCDUR9hNYaxk2e"
            ),
            "Preprod",
        );
        if (!window.cardano.nami) {
            window.alert("Please install Nami Wallet");
            return;
        }
        const nami = await window.cardano.nami.enable();
        lucid.selectWallet(nami);
        setAppState({
            ...initialAppState,
            lucid: lucid,
            wAddr: await lucid.wallet.address(),
        });
    };

    useEffect(() => {
        if (appState.lucid) return;
        connectLucidAndNami();
    }, [appState]);
    return (
        <AppStateContext.Provider value={{ appState, setAppState }}>
            <Component {...pageProps} />
        </AppStateContext.Provider>
    );
}
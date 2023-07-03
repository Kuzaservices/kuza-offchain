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

    // Init App state
    hello: string;

    // Project Script
    projectScript?: SpendingValidator;
    projectScriptHash?: ScriptHash;
    projectAddress?: Address;

    // Project Creator Tokens
    projectCreatorAssetClassHex?: Unit;
    projectCreatorTokPolicyIdHex?: PolicyId;
    projectCreatorTokTokenNameHex?: string;
    projectCreatorTokPolicy?: MintingPolicy;
    // projectWithFundAckUTxO?: UTxO;
    projectUtxoWithNFTRef?: string;

    // Funding Acknowledge Tokens
    fundingAckTokenAssetClassHex?: Unit;
    fundingAckTokenPolicyIdHex?: PolicyId;
    fundingAckTokenTokenNameHex?: string;
    fundingAckTokenPolicy?: MintingPolicy;
    projectWithFundAckUTxO?: UTxO;

    // Expenditure Proposal Tokens
    expenditurePropTokenAssetClassHex?: Unit;
    expenditurePropTokenPolicyIdHex?: PolicyId;
    expenditurePropTokenTokenNameHex?: string;
    expenditurePropTokenPolicy?: MintingPolicy;
    projectWithExpenditurePropUTxO?: UTxO;

    // Expenditure Spending Tokens
    expenditureSpendTokenAssetClassHex?: Unit;
    expenditureSpendTokenPolicyIdHex?: PolicyId;
    expenditureSpendTokenTokenNameHex?: string;
    expenditureSpendTokenPolicy?: MintingPolicy;
    projectWithExpenditureSpendUTxO?: UTxO;


}

const initialAppState: AppState = {
    hello: "Kijani Fund Demo",
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
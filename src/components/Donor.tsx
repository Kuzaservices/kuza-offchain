import { AppStateContext } from "@/pages/_app";
import { signAndSubmitTx } from "@/utilities/utilities";
import {
    PaymentKeyHash,
    SpendingValidator,
    UTxO,
    getAddressDetails,
} from "lucid-cardano";
import { applyParamsToScript, Data } from "lucid-cardano";
import { useContext, useEffect, useState } from "react";


const ProjectDatum = Data.Object({

});

type ProjectDatum = Data.Static<typeof ProjectDatum>


const ProjectRedeemer = Data.Enum([
    Data.Literal("Fund"),
    Data.Literal("MoveFundsProposal"),
    Data.Literal("MoveFunds"),
    Data.Literal("SubmitReport"),
]);

type ProjectRedeemer = Data.Static<typeof ProjectRedeemer>;

export default function Donor() {
    const { appState, setAppState } = useContext(AppStateContext);
    const {
        lucid,
        wAddr,
        projectScript,
        projectAddress,
        projectCreatorAssetClassHex,
        projectCreatorTokPolicyIdHex,
        projectCreatorTokTokenNameHex,
        projectCreatorTokPolicy,
        projectWithNftUTxO,
        projectUtxoWithNFTRef,
    } = appState

    const [donation, setDonation] = useState(0);

    const parseDonation = (r: string) => {
        const donation = Number(r);
        if (Number.isNaN(donation)) return;
        setDonation(donation);
    };

    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////// UPDATE ORACLE ///////////////////////////////////////////

    const donateToProject = async (amount: number) => {
        if (
            wAddr &&
            lucid &&
            projectCreatorAssetClassHex &&
            projectScript &&
            projectWithNftUTxO &&
            projectAddress
        ) {
            const pkh: string =
                getAddressDetails(wAddr).paymentCredential?.hash || "";

            const newProjDatum: ProjectDatum = {

            };                

            const tx = await lucid!
                .newTx()
                .collectFrom(
                    [projectWithNftUTxO], // UTXO to spend
                    Data.to<ProjectRedeemer>("Fund", ProjectRedeemer) // Redeemer
                )
                .payToContract(
                    projectAddress,
                    { inline: Data.to<ProjectDatum>(newProjDatum, ProjectDatum)},
                    { lovelace: BigInt(amount) }
                )
                .attachSpendingValidator(projectScript)
                .addSignerKey(pkh)
                .complete();

            await signAndSubmitTx(tx);
        } else {
            alert("Please, deploy the project before donating to it!");
        }
    };

    ///////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////// UI /////////////////////////////////////////////////

    return (
        <div className="w-full">
            <div className="flex flex-row w-full justify-center items-center my-8 text-lg text-zinc-800 font-quicksand ">
                <p>Donation Amount:</p>
                <input
                    type="number"
                    value={Number(donation)}
                    onChange={(e) => parseDonation(e.target.value)}
                    className="w-16 py-1 px-2 ml-2 border border-zinc-700 rounded"
                />
            </div>
            <div className="w-full flex flex-row gap-4">
                <button
                    onClick={donateToProject(donation)}
                    disabled={
                        !lucid ||
                        !wAddr ||
                        !projectCreatorAssetClassHex ||
                        donation === 0 ||
                        !!projectWithNftUTxO
                    }
                    className="w-full rounded-lg p-3 text-zinc-50 bg-zinc-800 shadow-[0_5px_0px_0px_rgba(0,0,0,0.6)] disabled:active:translate-y-0 disabled:active:shadow-[0_5px_0px_0px_rgba(0,0,0,0.2)] disabled:bg-zinc-200  disabled:shadow-[0_5px_0px_0px_rgba(0,0,0,0.2)] disabled:text-zinc-600 font-quicksand font-bold active:translate-y-[2px] active:shadow-[0_4px_0px_0px_rgba(0,0,0,0.6)]"
                >
                    {" "}
                    Fund Project
                </button>
            </div>
        </div>
    )        
}
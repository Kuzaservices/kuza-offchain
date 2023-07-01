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
    spendingMintingPolicyId: Data.Bytes(),
    fundingAckTokMintingPolicyId: Data.Bytes(),
    votingTokMintingPolicyId: Data.Bytes(),
    projectOwnerTokMintPolicyId: Data.Bytes(),
    projectFunders: Data.Bytes(),
    projectOwners: Data.Bytes(),
    fundingAmount: Data.Integer(),
    fundingAckAmount: Data.Integer(),
    currentProposalToken: Data.Bytes(),
});

type ProjectDatum = Data.Static<typeof ProjectDatum>


const ProjectRedeemer = Data.Enum([
    Data.Literal("Fund"),
    Data.Literal("MoveFundsProposal"),
    Data.Literal("MoveFunds"),
    Data.Literal("SubmitReport"),
]);

type ProjectRedeemer = Data.Static<typeof ProjectRedeemer>;


export default function Project() {
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

    const [target, setTarget] = useState(300000000);
    const [deadline, setDeadline] = useState(0);


    ///////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////// HELPER FUNCTIONS ///////////////////////////////////////////

    const getProjectNftUtxO = async () => {
        if (lucid && wAddr && projectAddress) {
            const projUtxO = await lucid.utxosAt(projectAddress).catch((err) => {
                console.log("Can't find Project UtxO");
            });
            if (!projUtxO) return;
            const projWithNftUTxO = projUtxO.find((utxo: UTxO) => {
                return Object.keys(utxo.assets).some((key) => {
                    return key == projectCreatorAssetClassHex;
                });
            });
            if (
                projWithNftUTxO == undefined ||
                projWithNftUTxO == projectWithNftUTxO
            )
                return;
            setAppState({
                ...appState,
                projectWithNftUTxO: projWithNftUTxO,
            });
        }
    };

    const parseTarget = (r: string) => {
        const target = Number(r);
        if (Number.isNaN(target)) return;
        setTarget(target);
    };

    const getFinalProjectScript = async (
        fundingTarget: number,
        fundingDeadline: number,
        projectCreator: PaymentKeyHash
    ): Promise<SpendingValidator | undefined> => {
        console.log("Deploying Project With Target and deadline: ", {
            target,
            deadline,
        });
        if (!lucid || !target || !deadline) return;

        const ProjectParams = Data.Tuple([Data.Integer(), Data.Integer(), Data.Bytes()]);
        type ProjectParams = Data.Static<typeof ProjectParams>;
        const projectScript: SpendingValidator = {
            type: "PlutusV2",
            script: applyParamsToScript<ProjectParams>(
                "",
                [BigInt(fundingTarget), BigInt(fundingDeadline), projectCreator],
                ProjectParams
            ),
        };
        return projectScript;
    };

    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////// DEPLOY ORACLE ///////////////////////////////////////////

    const deployProject = async () => {
        if (!lucid || !wAddr) {
            alert("Please connect wallet");
            return;
        }

        const pkh: string =
            getAddressDetails(wAddr).paymentCredential?.hash || "";
        const project = await getFinalProjectScript(target, deadline, pkh);
        if (!project || !projectCreatorAssetClassHex) {
            alert("Please mint project Creator Token first!");
            return;
        }

        const projDatum: ProjectDatum = {

        };

        const projectAddress = lucid!.utils.validatorToAddress(project);
        console.log("final oracle script: ", project);
        console.log("final oracle address: ", projectAddress);
        setAppState({
            ...appState,
            projectScript: project,
            projectAddress: projectAddress,
        });

        const tx = await lucid!
            .newTx()
            .payToContract(
                projectAddress,
                { inline: Data.to<ProjectDatum>(projDatum, ProjectDatum)},
                { [projectCreatorAssetClassHex]: 1n }
            )
            .addSignerKey(pkh)
            .complete();
        await signAndSubmitTx(tx);
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////// UI /////////////////////////////////////////////////

    return (
        <div className="w-full">
            <div className="flex flex-row w-full justify-center items-center my-8 text-lg text-zinc-800 font-quicksand ">
                <p>Funding target (in USD cents):</p>
                <input
                    type="number"
                    value={Number(target)}
                    onChange={(e) => parseTarget(e.target.value)}
                    className="w-16 py-1 px-2 ml-2 border border-zinc-700 rounded"
                />
            </div>
            <div className="flex flex-row w-full justify-center items-center my-8 text-lg text-zinc-800 font-quicksand ">
                <p>Funding target (in USD cents):</p>
                <input
                    type="number"
                    value={Number(target)}
                    onChange={(e) => parseTarget(e.target.value)}
                    className="w-16 py-1 px-2 ml-2 border border-zinc-700 rounded"
                />
            </div>
            <div className="flex flex-row w-full justify-center items-center my-8 text-lg text-zinc-800 font-quicksand ">
                <p>Funding target (in USD cents):</p>
                <input
                    type="number"
                    value={Number(target)}
                    onChange={(e) => parseTarget(e.target.value)}
                    className="w-16 py-1 px-2 ml-2 border border-zinc-700 rounded"
                />
            </div>
            <div className="w-full flex flex-row gap-4">
                <button
                    onClick={deployProject()}
                    disabled={
                        !lucid ||
                        !wAddr ||
                        !projectCreatorAssetClassHex ||
                        target === 0 ||
                        !!projectWithNftUTxO
                    }
                    className="w-full rounded-lg p-3 text-zinc-50 bg-zinc-800 shadow-[0_5px_0px_0px_rgba(0,0,0,0.6)] disabled:active:translate-y-0 disabled:active:shadow-[0_5px_0px_0px_rgba(0,0,0,0.2)] disabled:bg-zinc-200  disabled:shadow-[0_5px_0px_0px_rgba(0,0,0,0.2)] disabled:text-zinc-600 font-quicksand font-bold active:translate-y-[2px] active:shadow-[0_4px_0px_0px_rgba(0,0,0,0.6)]"
                >
                    {" "}
                    Deploy Project
                </button>
            </div>

        </div>
    );

}

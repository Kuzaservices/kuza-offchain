import { MintExpenditureProposalTokens, MoveFundsFromProject } from "../components/Expenditure";
import { AppStateContext } from "@/pages/_app";
import { signAndSubmitTx } from "@/utilities/utilities";
import {
    PaymentKeyHash,
    SpendingValidator,
    MintingPolicy,
    UTxO,
    Unit,
    getAddressDetails,
    PolicyId,
    fromText,
    Script,
} from "lucid-cardano";
import { applyParamsToScript, Data } from "lucid-cardano";
import { useContext, useEffect, useState } from "react";
import { 
    expenditureProposalTokenCBORHex,
    expenditureSpendingTokenCBORHex,
    fundingAckMintingCBORHex,
    projectValidatorCBORHex 
} from "../resources/contracts";


const ProjectDatum = Data.Object({
    spendingMintingPolicyId: Data.Bytes(),
    fundingAckTokMintingPolicyId: Data.Bytes(),
    proposalTokMintingPolicyId: Data.Bytes(),
    projectOwnerTokMintPolicyId: Data.Bytes(),
    projectFunders: Data.Array(Data.Bytes()),
    projectOwners: Data.Array(Data.Bytes()),
    fundingAmount: Data.Integer(),
    fundingAckAmount: Data.Integer(),
    currentProposalAmount: Data.Integer(),
});

type ProjectDatum = Data.Static<typeof ProjectDatum>


const ProjectRedeemer = Data.Enum([
    Data.Literal("Fund"),
    Data.Literal("MoveFundsProposal"),
    Data.Literal("MoveFunds"),
    Data.Literal("SubmitReport"),
]);

type ProjectRedeemer = Data.Static<typeof ProjectRedeemer>;

const FundingAckRedeemer = Data.Enum([
    Data.Literal("InitialMint"),
    Data.Literal("Mint"),
    Data.Literal("Burn"),
]);

type FundingAckRedeemer = Data.Static<typeof FundingAckRedeemer>;

type GetFinalFundingAcknowledgePolicy = {
    fundingAcknowledgePolicy: MintingPolicy;
    fundingAckAsset: Unit;
};

type GetFinalExpenditureProposalPolicy = {
    expenditureProposalPolicy: MintingPolicy;
    expenditurePropAsset: Unit;
};

type GetFinalExpenditureSpendingPolicy = {
    expenditureSpendingPolicy: MintingPolicy;
    expenditureSpendAsset: Unit;
};


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
        projectWithFundAckUTxO,
        projectUtxoWithNFTRef,

        fundingAckTokenAssetClassHex,
        fundingAckTokenPolicyIdHex,
        fundingAckTokenTokenNameHex,
        fundingAckTokenPolicy,

        expenditurePropTokenAssetClassHex,
        expenditurePropTokenPolicyIdHex,
        expenditurePropTokenTokenNameHex,
        expenditurePropTokenPolicy,
        projectWithExpenditurePropUTxO,

        expenditureSpendTokenAssetClassHex,
        expenditureSpendTokenPolicyIdHex,
        expenditureSpendTokenTokenNameHex,
        expenditureSpendTokenPolicy,
        projectWithExpenditureSpendUTxO,

    } = appState

    const [target, setTarget] = useState(300000000);
    const [deadline, setDeadline] = useState(1688373398);
    const [proposalDesc, setProposalDesc] = useState("")


    ///////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////// HELPER FUNCTIONS ///////////////////////////////////////////

    const getProjectNftUtxO = async () => {
        if (lucid && wAddr && projectAddress) {
            const projUtxO = await lucid.utxosAt(projectAddress).catch((err) => {
                console.log("Can't find Project UtxO");
            });
            if (!projUtxO) return;
            const projWithFundAckUTxO = projUtxO.find((utxo: UTxO) => {
                return Object.keys(utxo.assets).some((key) => {
                    return key == projectCreatorAssetClassHex;
                });
            });
            if (
                projWithFundAckUTxO == undefined ||
                projWithFundAckUTxO == projectWithFundAckUTxO
            )
                return;
            setAppState({
                ...appState,
                projectWithFundAckUTxO: projWithFundAckUTxO,
            });
        }
    };

    const parseTarget = (r: string) => {
        const target = Number(r);
        if (Number.isNaN(target)) return;
        setTarget(target);
    };

    const parseDeadline = (r: string) => {
        const deadline = Number(r);
        if (Number.isNaN(deadline)) return;
        setDeadline(deadline);
    };

    const parseProposal = (r: string) => {
        const proposal = String(r);
        if (proposal === null) return;
        setProposalDesc(proposal);
    }

    const getFinalProjectScript = async (
        fundingTarget: number,
        fundingDeadline: number,
        projectCreator: PaymentKeyHash,
    ): Promise<SpendingValidator | undefined> => {
        console.log("Creating Project With Target and deadline: ", {
            target,
            deadline,
        });
        if (!lucid || !target || !deadline || !projectCreatorTokPolicyIdHex ||!projectCreatorTokTokenNameHex) return;

        const ProjectParams = Data.Tuple([Data.Integer(), Data.Integer(), Data.Bytes(), Data.Bytes(), Data.Bytes()]);
        type ProjectParams = Data.Static<typeof ProjectParams>;
        const projectScript: SpendingValidator = {
            type: "PlutusV2",
            script: applyParamsToScript<ProjectParams>(
                projectValidatorCBORHex,
                [BigInt(fundingTarget), BigInt(fundingDeadline), projectCreator, projectCreatorTokPolicyIdHex, projectCreatorTokTokenNameHex],
                ProjectParams
            ),
        };

        await initProjectTokens(projectScript)
        return projectScript;
    };

    const getFinalFundingAckPolicy = async (project: Script): Promise<GetFinalFundingAcknowledgePolicy> => {
        if (!lucid || !wAddr) return;

        const projectScriptHash = await lucid.utils.validatorToScriptHash(project);

        const fundingAckInitSupply = 1
        const fundingAckTokenName = fromText("KIJANI PROJECT DONOR");

        const FundingAckParams = Data.Tuple([Data.Bytes(), Data.Integer(), Data.Bytes()])
        type FundingAckParams = Data.Static<typeof FundingAckParams>;

        const fundingAcknowledgePolicy: MintingPolicy = {
            type: "PlutusV2",
            script: applyParamsToScript<FundingAckParams>(
                fundingAckMintingCBORHex,
                [projectScriptHash, BigInt(fundingAckInitSupply), fundingAckTokenName],
                FundingAckParams
            ),
        };

        const fundingAckPolicyId: PolicyId = lucid!.utils.mintingPolicyToId(fundingAcknowledgePolicy);
        const fundingAckAsset: Unit = fundingAckPolicyId + fundingAckTokenName;

        // setAppState({
        //     ...appState,
        //     fundingAckTokenPolicyIdHex: fundingAckPolicyId,
        //     fundingAckTokenTokenNameHex: fundingAckTokenName,
        //     fundingAckTokenAssetClassHex: fundingAckAsset,
        //     fundingAckTokenPolicy: fundingAcknowledgePolicy,
        // });

        return { fundingAcknowledgePolicy, fundingAckAsset };

    };


    const getFinalExpenditureProposalPolicy = async (project: Script): Promise<GetFinalExpenditureProposalPolicy> => {
        if (!lucid || !wAddr) return;

        const projectScriptHash = await lucid.utils.validatorToScriptHash(project);

        const expenditureProposalMintAmout = 1
        const expenditureProposalTokenName = fromText("KIJANI PROJECT EXPENDITURE PROPOSAL");
        const expenditureInitializingProposal = fromText("This proposal is for initiating the minting script");

        const ExpenditureProposalParams = Data.Tuple([Data.Bytes(), Data.Bytes()])
        type ExpenditureProposalParams = Data.Static<typeof ExpenditureProposalParams>;

        const expenditureProposalPolicy: MintingPolicy = {
            type: "PlutusV2",
            script: applyParamsToScript<ExpenditureProposalParams>(
                expenditureProposalTokenCBORHex,
                [projectScriptHash, expenditureProposalTokenName],
                ExpenditureProposalParams
            ),
        };

        const expenditureProposalPolicyId: PolicyId = lucid!.utils.mintingPolicyToId(expenditureProposalPolicy);
        const expenditurePropAsset: Unit = expenditureProposalPolicyId + expenditureProposalTokenName;

        // setAppState({
        //     ...appState,
        //     expenditurePropTokenPolicyIdHex: expenditureProposalPolicyId,
        //     expenditurePropTokenTokenNameHex: expenditureProposalTokenName,
        //     expenditurePropTokenAssetClassHex: expenditurePropAsset,
        //     expenditurePropTokenPolicy: expenditureProposalPolicy,
        // });

        return { expenditureProposalPolicy, expenditurePropAsset };

    };

    const getFinalExpenditureSpendingPolicy = async (project: Script, expenditurePropPolId: PolicyId): Promise<GetFinalExpenditureSpendingPolicy> => {
        if (!lucid || !wAddr) return;

        const projectScriptHash = await lucid.utils.validatorToScriptHash(project);

        const expenditureSpendAmount = 10
        const expenditureSpendTokenName = fromText("KIJANI PROJECT SPEND");

        const ExpenditureSpendParams = Data.Tuple([Data.Bytes(), Data.Bytes(), Data.Integer(), Data.Bytes()])
        type ExpenditureSpendParams = Data.Static<typeof ExpenditureSpendParams>;

        const expenditureSpendingPolicy: MintingPolicy = {
            type: "PlutusV2",
            script: applyParamsToScript<ExpenditureSpendParams>(
                expenditureSpendingTokenCBORHex,
                [projectScriptHash, expenditurePropPolId, BigInt(expenditureSpendAmount), expenditureSpendTokenName],
                ExpenditureSpendParams
            ),
        };

        const expenditureSpendingPolicyId: PolicyId = lucid!.utils.mintingPolicyToId(expenditureSpendingPolicy);
        const expenditureSpendAsset: Unit = expenditureSpendingPolicyId + expenditureSpendTokenName;

        // setAppState({
        //     ...appState,
        //     expenditureSpendTokenPolicyIdHex: expenditureSpendingPolicyId,
        //     expenditureSpendTokenTokenNameHex: expenditureSpendTokenName,
        //     expenditureSpendTokenAssetClassHex: expenditureSpendAsset,
        //     expenditureSpendTokenPolicy: expenditureSpendingPolicy,
        // });

        return { expenditureSpendingPolicy, expenditureSpendAsset };

    };

    const initProjectTokens = async (project: Script) => {
        const { fundingAcknowledgePolicy, fundingAckAsset } = await getFinalFundingAckPolicy(project);

        console.log("funding ack token:", fundingAckAsset);

        const fundingAckPolicyId: PolicyId = lucid!.utils.mintingPolicyToId(fundingAcknowledgePolicy);

        console.log("Funding Ack policy id: ", fundingAckPolicyId);

        const { expenditureProposalPolicy, expenditurePropAsset } = await getFinalExpenditureProposalPolicy(project);

        console.log("expenditure proposal token:", expenditurePropAsset);

        const expenditurePropPolicyId: PolicyId = lucid!.utils.mintingPolicyToId(expenditureProposalPolicy);

        console.log("Expenditure proposal policy id: ", expenditurePropPolicyId);

        const { expenditureSpendingPolicy, expenditureSpendAsset } = await getFinalExpenditureSpendingPolicy(project, expenditurePropPolicyId);

        console.log("expenditure spending token:", expenditureSpendAsset);

        const expenditureSpendPolicyId: PolicyId = lucid!.utils.mintingPolicyToId(fundingAcknowledgePolicy);

        console.log("Expenditure Spend policy id: ", expenditureSpendPolicyId);
        setAppState({
            ...appState,
            expenditurePropTokenPolicyIdHex: expenditurePropPolicyId,
            fundingAckTokenPolicyIdHex: fundingAckPolicyId,
            expenditureSpendTokenPolicyIdHex: expenditureSpendPolicyId
        });

    }

    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////// DEPLOY PROJECT ///////////////////////////////////////////

    const deployProject = async () => {
        console.log("Creating project...");
        if (!lucid || !wAddr) {
            alert("Please connect wallet");
            return;
        }

        const pkh: string =
            getAddressDetails(wAddr).paymentCredential?.hash || "";

        console.log("Deploying pubkeyhash: ", pkh)

        if (!projectCreatorTokPolicyIdHex ){
            alert("Please mint project Creator Token first!");
        }
        const project = await getFinalProjectScript(target, deadline, pkh);
        console.log("Creating project with datum");

        if (!project || !projectCreatorAssetClassHex || !projectCreatorTokPolicyIdHex) {
            alert("Please mint project creator token first");
            return; 
        }

        // await initProjectTokens(project)

        console.log("The project creator minting policy: ", projectCreatorTokPolicyIdHex);
        console.log("The project funding ack minting policy: ", fundingAckTokenPolicyIdHex);
        console.log("The project expenditure prop minting policy: ", expenditurePropTokenPolicyIdHex);
        console.log("The project expenditure spend minting policy: ", expenditureSpendTokenPolicyIdHex);

        if (projectCreatorTokPolicyIdHex && 
            fundingAckTokenPolicyIdHex &&
            expenditurePropTokenPolicyIdHex && 
            expenditureSpendTokenPolicyIdHex){

                const projectAddress = lucid!.utils.validatorToAddress(project);
                console.log("final project script: ", project);
                console.log("final project address: ", projectAddress);
                setAppState({
                    ...appState,
                    projectScript: project,
                    projectAddress: projectAddress,
                });

                const projDatum: ProjectDatum = {
                    spendingMintingPolicyId: expenditureSpendTokenPolicyIdHex,
                    fundingAckTokMintingPolicyId: fundingAckTokenPolicyIdHex,
                    proposalTokMintingPolicyId: expenditurePropTokenPolicyIdHex,
                    projectOwnerTokMintPolicyId: projectCreatorTokPolicyIdHex ,
                    projectFunders: [pkh],
                    projectOwners: [pkh],
                    fundingAmount: BigInt(0),
                    fundingAckAmount: BigInt(0),
                    currentProposalAmount: BigInt(0),
                };

                const tx = await lucid!
                    .newTx()
                    .payToContract(
                        projectAddress,
                        { inline: Data.to<ProjectDatum>(projDatum, ProjectDatum) },
                        { [projectCreatorAssetClassHex]: BigInt(1) }
                    )
                    .addSignerKey(pkh)
                    .complete();
                await signAndSubmitTx(tx);

            } else {
                alert("Please init project tokens first");
            }

        // if (!project || !projectCreatorAssetClassHex ||  !fundingAckTokenAssetClassHex || !fundingAckTokenPolicyIdHex || !projectCreatorTokPolicyIdHex) {
        //     alert("Please mint project funding ack tokens first");
        //     return; 
        // }
        
        
    }

    ///////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////// UI /////////////////////////////////////////////////

    return (
        <div className="w-full">
            <div className="flex flex-row w-full justify-center items-center my-8 text-lg text-zinc-800 font-quicksand ">
                <p>Funding target (in ADA lovelace):</p>
                <input
                    type="number"
                    value={Number(target)}
                    onChange={(e) => parseTarget(e.target.value)}
                    className="w-16 py-1 px-2 ml-2 border border-zinc-700 rounded"
                />
            </div>
            <div className="flex flex-row w-full justify-center items-center my-8 text-lg text-zinc-800 font-quicksand ">
                <p>Funding deadline (in seconds):</p>
                <input
                    type="number"
                    value={Number(deadline)}
                    onChange={(e) => parseDeadline(e.target.value)}
                    className="w-16 py-1 px-2 ml-2 border border-zinc-700 rounded"
                />
            </div>
            <div className="w-full flex flex-row gap-4">
                <button
                    onClick={deployProject}
                    disabled={
                        !lucid ||
                        !wAddr ||
                        !projectCreatorAssetClassHex ||
                        !!projectAddress ||
                        target === 0
                    }
                    className="w-full rounded-lg p-3 text-zinc-50 bg-zinc-800 shadow-[0_5px_0px_0px_rgba(0,0,0,0.6)] disabled:active:translate-y-0 disabled:active:shadow-[0_5px_0px_0px_rgba(0,0,0,0.2)] disabled:bg-zinc-200  disabled:shadow-[0_5px_0px_0px_rgba(0,0,0,0.2)] disabled:text-zinc-600 font-quicksand font-bold active:translate-y-[2px] active:shadow-[0_4px_0px_0px_rgba(0,0,0,0.6)]"
                >
                    {" "}
                    Deploy Project
                </button>
            </div>
            <MintExpenditureProposalTokens/>
            <MoveFundsFromProject/>
        </div>
    );

}

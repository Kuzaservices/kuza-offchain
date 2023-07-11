import { PolicyId, UTxO, Unit } from "lucid-cardano";
import React, { useContext } from "react";
import {
    applyParamsToScript,
    Data,
    MintingPolicy,
    fromText,
    Script,
    getAddressDetails,
} from "lucid-cardano";
import { AppStateContext } from "@/pages/_app";
import { signAndSubmitTx } from "@/utilities/utilities";
import { 
    projectCreatorTokenCBORHex,
    fundingAckMintingCBORHex,
} from "../resources/contracts";

export function MintProjectOwnerToken() {
    const { appState, setAppState } = useContext(AppStateContext);
    const { lucid, wAddr, projectCreatorTokPolicyIdHex } = appState;

    const getUtxo = async (address: string): Promise<UTxO> => {
        const utxos = await lucid!.utxosAt(address);
        const utxo = utxos[0];
        return utxo;
    };

    type GetFinalProjectCreatorPolicy = {
        projectCreatorPolicy: MintingPolicy;
        unit: Unit;
    };

    const getFinalCreatorPolicy = async (utxo: UTxO): Promise<GetFinalProjectCreatorPolicy> => {
        const tn = fromText("KIJANI PROJECT CREATOR");
        const ProjCreatorParams = Data.Tuple([Data.Bytes(), Data.Integer(), Data.Bytes()]);
        type ProjCreatorParams = Data.Static<typeof ProjCreatorParams>;
        const projectCreatorPolicy: MintingPolicy = {
            type: "PlutusV2",
            script: applyParamsToScript<ProjCreatorParams>(
                projectCreatorTokenCBORHex,
                [utxo.txHash, BigInt(utxo.outputIndex), tn],
                ProjCreatorParams
            ),
        };
        const policyId: PolicyId = lucid!.utils.mintingPolicyToId(projectCreatorPolicy);
        const unit: Unit = policyId + tn;

        setAppState({
            ...appState,
            projectCreatorTokPolicyIdHex: policyId,
            projectCreatorTokTokenNameHex: tn,
            projectCreatorAssetClassHex: unit,
            projectCreatorTokPolicy: projectCreatorPolicy,
        });

        return { projectCreatorPolicy, unit };
    };

    const mintProjectCreatorToken = async () => {
        console.log("Minting Project Creator Token for " + wAddr);
        if (wAddr) {
            const utxo = await getUtxo(wAddr);
            const { projectCreatorPolicy, unit } = await getFinalCreatorPolicy(utxo);

            const tx = await lucid!
                .newTx()
                .mintAssets({ [unit]: 1n }, Data.void())
                .attachMintingPolicy(projectCreatorPolicy)
                .collectFrom([utxo])
                .complete();

            await signAndSubmitTx(tx);
        }
    };

    return (
        <button
            onClick={mintProjectCreatorToken}
            disabled={!wAddr || !!projectCreatorTokPolicyIdHex}
            className=" bg-zinc-800 text-white font-quicksand text-lg font-bold py-3 px-8 rounded-lg shadow-[0_5px_0px_0px_rgba(0,0,0,0.6)] active:translate-y-[2px] active:shadow-[0_4px_0px_0px_rgba(0,0,0,0.6)] disabled:active:translate-y-0 disabled:active:shadow-[0_5px_0px_0px_rgba(0,0,0,0.2)] disabled:bg-zinc-200 disabled:shadow-[0_5px_0px_0px_rgba(0,0,0,0.2)] disabled:text-zinc-600"
        >
            {" "}
            Mint Project Creator&apos;s Token
        </button>
    );
}

export function MintFundingAckInitialTokens() {

    const { appState, setAppState } = useContext(AppStateContext);
    const { lucid, 
            wAddr, 
            fundingAckTokenPolicyIdHex, 
            projectScript, 
            projectAddress, 
            fundingAckTokenAssetClassHex, 
            projectCreatorAssetClassHex, 
            projectCreatorTokPolicyIdHex,

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
         } = appState;


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

    const FundingAckRedeemer = Data.Enum([
        Data.Literal("InitialMint"),
        Data.Literal("Mint"),
        Data.Literal("Burn"),
    ]);
    
    type FundingAckRedeemer = Data.Static<typeof FundingAckRedeemer>;

    type GetFinalFundingAcknowledgePolicy = {
        fundingAcknowledgePolicy: MintingPolicy;
        unit: Unit;
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
        const unit: Unit = fundingAckPolicyId + fundingAckTokenName;

        setAppState({
            ...appState,
            fundingAckTokenPolicyIdHex: fundingAckPolicyId,
            fundingAckTokenTokenNameHex: fundingAckTokenName,
            fundingAckTokenAssetClassHex: unit,
            fundingAckTokenPolicy: fundingAcknowledgePolicy,
        });

        // const potentialFundAckStateUpdate {
        //     fundingAckTokenPolicyIdHex: fundingAckPolicyId,
        //     fundingAckTokenTokenNameHex: fundingAckTokenName,
        //     fundingAckTokenAssetClassHex: unit,
        //     fundingAckTokenPolicy: fundingAcknowledgePolicy,

        // };

        return { fundingAcknowledgePolicy, unit };

    };

    const mintInitialFundingAckTokens = async () => {

        if (!lucid || !wAddr) return;

        const pkh: string =
                getAddressDetails(wAddr).paymentCredential?.hash || "";


        console.log("Minting Funding Ack Tokens for: " + lucid!.utils.validatorToAddress(projectScript));

        if(projectScript && !!projectCreatorTokPolicyIdHex && !!projectAddress && 
            !!expenditureSpendTokenPolicyIdHex && !!fundingAckTokenPolicyIdHex && !!expenditurePropTokenPolicyIdHex){
            const mintAmount = 1

            const mintAmountHalving = 100/5


            const { fundingAcknowledgePolicy, unit } = await getFinalFundingAckPolicy(projectScript);

            // TODO: These actual policies are needed at this point
            const projDatum: ProjectDatum = {
                spendingMintingPolicyId: expenditureSpendTokenPolicyIdHex,
                fundingAckTokMintingPolicyId: fundingAckTokenPolicyIdHex,
                proposalTokMintingPolicyId: expenditurePropTokenPolicyIdHex,
                projectOwnerTokMintPolicyId: projectCreatorTokPolicyIdHex ,
                projectFunders: [pkh],
                projectOwners: [pkh],
                fundingAmount: BigInt(0),
                fundingAckAmount: BigInt(mintAmount),
                currentProposalAmount: BigInt(0),
            };

            const tx = await lucid!
                .newTx()
                .mintAssets({ [unit]: BigInt(mintAmount) }, Data.to<FundingAckRedeemer>("InitialMint", FundingAckRedeemer))
                .attachMintingPolicy(fundingAcknowledgePolicy)
                .payToContract(
                    projectAddress,
                    { inline: Data.to<ProjectDatum>(projDatum, ProjectDatum) },
                    { [unit]: BigInt(mintAmount) },
                )
                // .payToContract(
                //     projectAddress,
                //     { inline: Data.to<ProjectDatum>(projDatum, ProjectDatum) },
                //     { [unit]: BigInt(mintAmountHalving) },
                // )
                // .payToContract(
                //     projectAddress,
                //     { inline: Data.to<ProjectDatum>(projDatum, ProjectDatum) },
                //     { [unit]: BigInt(mintAmountHalving) },
                // )
                // .payToContract(
                //     projectAddress,
                //     { inline: Data.to<ProjectDatum>(projDatum, ProjectDatum) },
                //     { [unit]: BigInt(mintAmountHalving) },
                // )
                // .payToContract(
                //     projectAddress,
                //     { inline: Data.to<ProjectDatum>(projDatum, ProjectDatum) },
                //     { [unit]: BigInt(mintAmountHalving) },
                // )
                .addSignerKey(pkh)
                .complete();

            await signAndSubmitTx(tx);

        } else {
            alert("Initialize the project tokens")
        }



    }

    return (
        <button
            onClick={mintInitialFundingAckTokens}
            disabled={!wAddr || !projectScript || !projectAddress || !projectCreatorTokPolicyIdHex}
            className=" bg-zinc-800 text-white font-quicksand text-lg font-bold py-3 px-8 rounded-lg shadow-[0_5px_0px_0px_rgba(0,0,0,0.6)] active:translate-y-[2px] active:shadow-[0_4px_0px_0px_rgba(0,0,0,0.6)] disabled:active:translate-y-0 disabled:active:shadow-[0_5px_0px_0px_rgba(0,0,0,0.2)] disabled:bg-zinc-200 disabled:shadow-[0_5px_0px_0px_rgba(0,0,0,0.2)] disabled:text-zinc-600"
        >
            {" "}
            Mint Funding Ack Tokens
        </button>
    );

}
import { PolicyId, UTxO, Unit, Tx, TxComplete, Address } from "lucid-cardano";
import React, { useContext, useState } from "react";
import {
    applyParamsToScript,
    Data,
    MintingPolicy,
    Script,
    fromText,
    getAddressDetails,
    Utils,
    Constr,
} from "lucid-cardano";
import { AppStateContext } from "@/pages/_app";
import { signAndSubmitTx } from "@/utilities/utilities";
import { expenditureSpendingTokenCBORHex, expenditureProposalTokenCBORHex } from "../resources/contracts";

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

export function MintExpenditureProposalTokens() {

    const { appState, setAppState } = useContext(AppStateContext);
    const { lucid, 
            wAddr, 
            fundingAckTokenPolicyIdHex, 
            projectScript, 
            projectAddress, 
            fundingAckTokenAssetClassHex, 
            projectCreatorAssetClassHex, 
            projectCreatorTokPolicyIdHex,
            projectWithFundAckUTxO,
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
         } = appState;

    const [propAmount, setPropAmount] = useState(0);
    const [proposalDesc, setProposalDesc] = useState("");

    const parseProposalAmount = (r: string) => {
        const propAmount = Number(r);
        if (Number.isNaN(propAmount)) return;
        setPropAmount(propAmount);
    };

    const parseProposal = (r: string) => {
        const proposal = String(r);
        if (proposal === null) return;
        setProposalDesc(proposal);
    };

    const getProjectFundAckUtxO = async () => {
        if (lucid && wAddr && projectAddress) {
            const projUtxO = await lucid.utxosAt(projectAddress).catch((err) => {
                console.log("Can't find Project UtxO");
            });
            if (!projUtxO) return;
            const projWithFundAckUTxO = projUtxO.find((utxo: UTxO) => {
                return Object.keys(utxo.assets).some((key) => {
                    return key == fundingAckTokenAssetClassHex;
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

    type GetFinalExpenditureProposalPolicy = {
        expenditureProposalPolicy: MintingPolicy;
        unit: Unit;
    };

    const getFinalExpenditureProposalPolicy = async (project: Script, expenditureName: string, expenditureDetails: string): Promise<GetFinalExpenditureProposalPolicy> => {
        if (!lucid || !wAddr) return;

        const projectScriptHash = await lucid.utils.validatorToScriptHash(project);

        const expenditureProposalMintAmout = 1
        const expenditureProposalTokenName = fromText(expenditureName);

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
        const unit: Unit = expenditureProposalPolicyId + expenditureProposalTokenName;

        setAppState({
            ...appState,
            expenditurePropTokenPolicyIdHex: expenditureProposalPolicyId,
            expenditurePropTokenTokenNameHex: expenditureProposalTokenName,
            expenditurePropTokenAssetClassHex: unit,
            expenditurePropTokenPolicy: expenditureProposalPolicy,
        });

        return { expenditureProposalPolicy, unit };

    };

    const mintExpenditureProposalTokens = async (proposalAmount: number, proposalDescription: string) => {
        await getProjectFundAckUtxO()

        if (!lucid || !wAddr) return;

        const pkh: string =
                getAddressDetails(wAddr).paymentCredential?.hash || "";


        console.log("Minting Expenditure Proposal Tokens for: " + lucid!.utils.validatorToAddress(projectScript));

        const expenditureTitle = proposalDescription

        if (
            wAddr &&
            lucid &&
            projectCreatorAssetClassHex &&
            projectCreatorTokPolicyIdHex &&
            projectScript &&
            projectWithFundAckUTxO &&
            fundingAckTokenAssetClassHex &&
            fundingAckTokenPolicy &&
            projectAddress
        ) {

            const expenditureProposalDescription = fromText("Wanted to pay for something")
            
            const { expenditureProposalPolicy, unit } = await getFinalExpenditureProposalPolicy(projectScript, expenditureTitle, expenditureProposalDescription);
            const expenditurePropTokenPolicyId =  lucid!.utils.mintingPolicyToId(expenditureProposalPolicy);

            const actualDatum = Data.from<ProjectDatum>(projectWithFundAckUTxO.datum, ProjectDatum);

            console.log("The datum before expenditure proposal: ", actualDatum);

            const funders = actualDatum.projectFunders;

            const expenditurePropTokenMintingAmount = funders.length + 1;


            const updatedProjDatum: ProjectDatum = {
                spendingMintingPolicyId: actualDatum.spendingMintingPolicyId, // We might want to set this as the 'current one'
                fundingAckTokMintingPolicyId: actualDatum.fundingAckTokMintingPolicyId,
                proposalTokMintingPolicyId: expenditurePropTokenPolicyId,
                projectOwnerTokMintPolicyId: actualDatum.projectOwnerTokMintPolicyId ,
                projectFunders: actualDatum.projectFunders,
                projectOwners: actualDatum.projectOwners,
                fundingAmount: actualDatum.fundingAmount,
                fundingAckAmount: actualDatum.fundingAckAmount,
                currentProposalAmount: BigInt(proposalAmount),
            };

            // const lucidUtils = new Utils(lucid);

            // const funderTxList = new Array<TxComplete>();
            // for (let funder of funders){
            //     const funderCredential = lucidUtils.keyHashToCredential(funder);
            //     const funderAddress = lucidUtils.credentialToAddress(funderCredential);
            //     const funderTx = await lucid!
            //         .newTx()
            //         .payToAddress(funderAddress, { [unit]: BigInt(1)})
            //         .addSignerKey(pkh)
            //         .complete();
            //     funderTxList.push(funderTx)                    
            // };

            const tx = await lucid!
                .newTx()
                .mintAssets({ [unit]: BigInt(expenditurePropTokenMintingAmount) }, Data.void())
                .attachMintingPolicy(expenditureProposalPolicy)
                .payToContract(
                    projectAddress,
                    { inline: Data.to<ProjectDatum>(updatedProjDatum, ProjectDatum) },
                    { [unit]: BigInt(expenditurePropTokenMintingAmount) },
                )
                .addSignerKey(pkh)
                .complete();

            await signAndSubmitTx(tx);

            // for (let tx of funderTxList){
            //     await signAndSubmitTx(tx);
            // }

            

        } else {
            alert("Update project tokens with datum!")
        }
    }

    return (
        <div className="w-full">
            <div className="flex flex-row w-full justify-center items-center my-8 text-lg text-zinc-800 font-quicksand ">
                <p>Expenditure Proposal Amount:</p>
                <input
                    type="number"
                    value={Number(propAmount)}
                    onChange={(e) => parseProposalAmount(e.target.value)}
                    className="w-16 py-1 px-2 ml-2 border border-zinc-700 rounded"
                />
            </div>
            <div className="flex flex-row w-full justify-center items-center my-8 text-lg text-zinc-800 font-quicksand ">
                <p>Expenditure Proposal Title: </p>
                <input
                    type="string"
                    value={proposalDesc}
                    onChange={(e) => parseProposal(e.target.value)}
                    className="w-16 py-1 px-2 ml-2 border border-zinc-700 rounded"
                />
            </div>
            <div className="w-full flex flex-row gap-4">
                <button
                    onClick={() => mintExpenditureProposalTokens(propAmount, proposalDesc)}
                    disabled={
                        !lucid ||
                        !wAddr ||
                        !projectAddress ||
                        !fundingAckTokenAssetClassHex ||
                        propAmount === 0 ||
                        proposalDesc === null
                    }
                    className="w-full rounded-lg p-3 text-zinc-50 bg-zinc-800 shadow-[0_5px_0px_0px_rgba(0,0,0,0.6)] disabled:active:translate-y-0 disabled:active:shadow-[0_5px_0px_0px_rgba(0,0,0,0.2)] disabled:bg-zinc-200  disabled:shadow-[0_5px_0px_0px_rgba(0,0,0,0.2)] disabled:text-zinc-600 font-quicksand font-bold active:translate-y-[2px] active:shadow-[0_4px_0px_0px_rgba(0,0,0,0.6)]"
                >
                    {" "}
                    Submit Expenditure Proposal
                </button>
            </div>
        </div>
    );

}

export function MoveFundsFromProject() {

    const { appState, setAppState } = useContext(AppStateContext);
    const { lucid, 
            wAddr, 
            fundingAckTokenPolicyIdHex, 
            projectScript, 
            projectAddress, 
            fundingAckTokenAssetClassHex, 
            projectCreatorAssetClassHex, 
            projectCreatorTokPolicyIdHex,

            expenditurePropTokenPolicyIdHex,

            expenditureSpendTokenAssetClassHex,
            expenditureSpendTokenPolicyIdHex,
            expenditureSpendTokenTokenNameHex,
            expenditureSpendTokenPolicy,
            projectWithExpenditureSpendUTxO,
         } = appState;

    const [amountToMove, setAmountToMove] = useState(0);
    const [recipientAddress, setRecipientAddress] = useState("");


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

    const parseAmount = (r: string) => {
        const amountToMove = Number(r);
        if (Number.isNaN(amountToMove)) return;
        setAmountToMove(amountToMove);
    };

    const parseAddress = (r: string) => {
        const recipientAddress = String(r);
        if (Number.isNaN(recipientAddress)) return;
        setRecipientAddress(recipientAddress);
    };

    const getExpenditureSpendingUtxO = async () => {
        if (lucid && wAddr && projectAddress) {
            const projUtxO = await lucid.utxosAt(projectAddress).catch((err) => {
                console.log("Can't find Project UtxO");
            });
            if (!projUtxO) return;
            const projWithExpSpendUTxO = projUtxO.find((utxo: UTxO) => {
                return Object.keys(utxo.assets).some((key) => {
                    return key == expenditureSpendTokenAssetClassHex;
                });
            });
            if (
                projWithExpSpendUTxO == undefined ||
                projWithExpSpendUTxO == projectWithExpenditureSpendUTxO
            )
                return;
            setAppState({
                ...appState,
                projectWithExpenditureSpendUTxO: projWithExpSpendUTxO,
            });
        }
    };

    const getProjectLovelaceUtxO = async () => {
        if (lucid && wAddr && projectAddress) {
            const projUtxO = await lucid.utxosAt(projectAddress).catch((err) => {
                console.log("Can't find Project UtxO");
            });
            if (!projUtxO) return;
            const projWithExpSpendUTxO = projUtxO.find((utxo: UTxO) => {
                return Object.keys(utxo.assets).some((key) => {
                    return key == expenditureSpendTokenAssetClassHex;
                });
            });
            if (
                projWithExpSpendUTxO == undefined ||
                projWithExpSpendUTxO == projectWithExpenditureSpendUTxO
            )
                return;
            setAppState({
                ...appState,
                projectWithExpenditureSpendUTxO: projWithExpSpendUTxO,
            });
        }
    };
    
    
    type ProjectDatum = Data.Static<typeof ProjectDatum>

    type GetFinalExpenditureSpendingPolicy = {
        expenditureSpendingPolicy: MintingPolicy;
        unit: Unit;
    };

    const getFinalExpenditureSpendingPolicy = async (project: Script, expenditurePropPolId: PolicyId): Promise<GetFinalExpenditureSpendingPolicy> => {
        if (!lucid || !wAddr) return;

        const projectScriptHash = await lucid.utils.validatorToScriptHash(project);

        const fundingAckInitSupply = 1
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
        const unit: Unit = expenditureSpendingPolicyId + expenditureSpendTokenName;

        setAppState({
            ...appState,
            expenditureSpendTokenPolicyIdHex: expenditureSpendingPolicyId,
            expenditureSpendTokenTokenNameHex: expenditureSpendTokenName,
            expenditureSpendTokenAssetClassHex: unit,
            expenditureSpendTokenPolicy: expenditureSpendingPolicy,
        });

        return { expenditureSpendingPolicy, unit };

    };

    const moveFundsToAddress = async (amount: number, recipient: string) => {
        await getExpenditureSpendingUtxO()
        if (!lucid || !wAddr) return;


        const pkh: string =
                getAddressDetails(wAddr).paymentCredential?.hash || "";


        console.log("Moving Funds From: " + lucid!.utils.validatorToAddress(projectScript));
        console.log("Moving Funds to: " + recipient);
        console.log("");

        if (
            wAddr &&
            lucid &&
            projectScript &&
            projectWithExpenditureSpendUTxO &&
            expenditureSpendTokenAssetClassHex &&
            projectAddress
        ) {

            const actualDatum = Data.from<ProjectDatum>(projectWithExpenditureSpendUTxO.datum, ProjectDatum);

            console.log("The datum of the utxo getting spend: ", actualDatum);
            
            const utxos = await lucid.utxosAt(projectAddress);

            // const adaUtxos = utxos.filter((utxo) => Object.keys(utxo.assets) === "lovelace");
            const adaUtxos = utxos.filter((utxo) => utxo.assets["lovelace"]);

            console.log("Found lovelace utxos", adaUtxos);

            const moveFundsRedeemer = new Constr(2, [amount, pkh]);


            const moveFundsDatum: ProjectDatum = {
                spendingMintingPolicyId: actualDatum.spendingMintingPolicyId,
                fundingAckTokMintingPolicyId: actualDatum.fundingAckTokMintingPolicyId,
                proposalTokMintingPolicyId: actualDatum.proposalTokMintingPolicyId,
                projectOwnerTokMintPolicyId: actualDatum.projectOwnerTokMintPolicyId,
                projectFunders: actualDatum.projectFunders,
                projectOwners: actualDatum.projectOwners,
                fundingAmount: actualDatum.fundingAmount,
                fundingAckAmount: actualDatum.fundingAckAmount,
                currentProposalAmount: actualDatum.currentProposalAmount,
            };

            const tx = await lucid!
                .newTx()
                .collectFrom(adaUtxos, Data.to(moveFundsRedeemer))
                .payToAddressWithData(
                    recipient,
                    { inline: Data.to<ProjectDatum>(moveFundsDatum, ProjectDatum) },
                    { lovelace: BigInt(amount) }
                )
                .payToContract(
                    projectAddress,
                    { inline: Data.to<ProjectDatum>(moveFundsDatum, ProjectDatum) },
                    { [expenditureSpendTokenAssetClassHex]: BigInt(1) },
                )
                .attachSpendingValidator(projectScript)
                .addSignerKey(pkh)
                .complete();

            await signAndSubmitTx(tx);

        } else {
            alert("Move Funds details not present!")
        }
    }

    return (
        <div className="w-full">
            <div className="flex flex-row w-full justify-center items-center my-8 text-lg text-zinc-800 font-quicksand ">
                <p>Move Funds amount (in ADA lovelace):</p>
                <input
                    type="number"
                    value={Number(amountToMove)}
                    onChange={(e) => parseAmount(e.target.value)}
                    className="w-16 py-1 px-2 ml-2 border border-zinc-700 rounded"
                />
            </div>
            <div className="flex flex-row w-full justify-center items-center my-8 text-lg text-zinc-800 font-quicksand ">
                <p>Funds recipient (Address): </p>
                <input
                    type="string"
                    value={recipientAddress}
                    onChange={(e) => parseAddress(e.target.value)}
                    className="w-16 py-1 px-2 ml-2 border border-zinc-700 rounded"
                />
            </div>
            <div className="w-full flex flex-row gap-4">
                <button
                    onClick={() => moveFundsToAddress(amountToMove, recipientAddress)}
                    disabled={
                        !lucid ||
                        !wAddr ||
                        !projectCreatorAssetClassHex ||
                        !projectAddress ||
                        amountToMove === 0 ||
                        recipientAddress === null
                    }
                    className="w-full rounded-lg p-3 text-zinc-50 bg-zinc-800 shadow-[0_5px_0px_0px_rgba(0,0,0,0.6)] disabled:active:translate-y-0 disabled:active:shadow-[0_5px_0px_0px_rgba(0,0,0,0.2)] disabled:bg-zinc-200  disabled:shadow-[0_5px_0px_0px_rgba(0,0,0,0.2)] disabled:text-zinc-600 font-quicksand font-bold active:translate-y-[2px] active:shadow-[0_4px_0px_0px_rgba(0,0,0,0.6)]"
                >
                    {" "}
                    Move Funds From Project
                </button>
            </div>
        </div>
    );

}
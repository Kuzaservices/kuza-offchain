import { AppStateContext } from "@/pages/_app";
import { signAndSubmitTx, findDatumUTxoAtAtScript } from "@/utilities/utilities";
import { expenditureSpendingTokenCBORHex } from "../resources/contracts";
import {
    PaymentKeyHash,
    SpendingValidator,
    MintingPolicy,
    Script,
    UTxO,
    PolicyId,
    Unit,
    Utils,
    fromText,
    getAddressDetails,
    Datum,
    Constr,
} from "lucid-cardano";
import { applyParamsToScript, Data } from "lucid-cardano";
import { useContext, useEffect, useState } from "react";


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

type GetFinalExpenditureSpendingPolicy = {
    expenditureSpendingPolicy: MintingPolicy;
    expenditureSpendAsset: Unit;
};

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
        projectWithFundAckUTxO,
        fundingAckTokenAssetClassHex,
        fundingAckTokenPolicy,
        projectWithExpenditurePropUTxO,
        expenditurePropTokenAssetClassHex,
        expenditureSpendTokenAssetClassHex,
        projectUtxoWithNFTRef,
    } = appState

    const [expSpendDesc, setExpSpendDesc] = useState("");

    const parseExpSpendDesc = (r: string) => {
        const expSpendDesc = String(r);
        if (expSpendDesc === null) return;
        setExpSpendDesc(expSpendDesc);
    };

    const getProjectNftUtxO = async () => {
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

    const getExpenditureProposalUtxO = async () => {
        if (lucid && wAddr && projectAddress) {
            const projUtxO = await lucid.utxosAt(projectAddress).catch((err) => {
                console.log("Can't find Project UtxO");
            });
            if (!projUtxO) return;
            const projWithExpPropUTxO = projUtxO.find((utxo: UTxO) => {
                return Object.keys(utxo.assets).some((key) => {
                    return key == expenditurePropTokenAssetClassHex;
                });
            });
            if (
                projWithExpPropUTxO == undefined ||
                projWithExpPropUTxO == projectWithExpenditurePropUTxO
            )
                return;
            setAppState({
                ...appState,
                projectWithExpenditurePropUTxO: projWithExpPropUTxO,
            });
        }
    };

    const [donation, setDonation] = useState(10000000);

    const parseDonation = (r: string) => {
        const donation = Number(r);
        if (Number.isNaN(donation)) return;
        setDonation(donation);
    };

    const getFinalExpenditureSpendingPolicy = async (project: Script, expenditurePropPolId: PolicyId,
         proposeExpAmount: number, spendTokenTitle: string): Promise<GetFinalExpenditureSpendingPolicy> => {
        if (!lucid || !wAddr) return;

        const projectScriptHash = await lucid.utils.validatorToScriptHash(project);

        const expenditureSpendAmount = proposeExpAmount
        const expenditureSpendTokenName = fromText(spendTokenTitle);

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

        setAppState({
            ...appState,
            expenditureSpendTokenPolicyIdHex: expenditureSpendingPolicyId,
            expenditureSpendTokenTokenNameHex: expenditureSpendTokenName,
            expenditureSpendTokenAssetClassHex: expenditureSpendAsset,
            expenditureSpendTokenPolicy: expenditureSpendingPolicy,
        });

        return { expenditureSpendingPolicy, expenditureSpendAsset };

    };

    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////// DONATE TO PROJECT ///////////////////////////////////////////

    const donateToProject = async (amount: number) => {
        await getProjectNftUtxO()
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
            const pkh: string =
                getAddressDetails(wAddr).paymentCredential?.hash || "";

            // const newProjContDatum: ProjectDatum = {
            //     // fundingAckTokMintingPolicyId: fundingAckTokenPolicyIdHex,
            //     projectOwnerTokMintPolicyId: projectCreatorTokPolicyIdHex ,
            //     projectFunders: [pkh],
            //     projectOwners: [pkh],
            //     fundingAmount: 0n,
            //     fundingAckAmount: 100n,
            // };

            // const utxoDtm: Datum = Data.to<ProjectDatum>(newProjContDatum, ProjectDatum)

            // const projectUtxo = findDatumUTxoAtAtScript(lucid, projectAddress, utxoDtm)
            // console.log("Found Utxo in project with: ", (await projectUtxo))

            console.log("Funding Project with address: ", projectAddress);
            console.log("Donor to spend: ", projectWithFundAckUTxO);
            console.log("Expecting ack token: ", fundingAckTokenAssetClassHex);

            const actualDatum = Data.from<ProjectDatum>(projectWithFundAckUTxO.datum, ProjectDatum);

            console.log("The datum of the utxo getting spend: ", actualDatum);

            const fundRedParam = new Constr(0, [pkh]); // THe redeemer with parameters

            const fundAckAmountToFunder = BigInt(1);

            const fundAckAmountToProject = actualDatum.fundingAckAmount - fundAckAmountToFunder;

            const fundAckNewMintToProject = BigInt(1);

            const projDonationDatum: ProjectDatum = {
                spendingMintingPolicyId: actualDatum.spendingMintingPolicyId, 
                fundingAckTokMintingPolicyId: actualDatum.fundingAckTokMintingPolicyId,
                proposalTokMintingPolicyId: actualDatum.proposalTokMintingPolicyId,
                projectOwnerTokMintPolicyId: actualDatum.projectOwnerTokMintPolicyId ,
                projectFunders: [...actualDatum.projectFunders, pkh],
                projectOwners: actualDatum.projectOwners,
                fundingAmount: actualDatum.fundingAmount + BigInt(amount),
                fundingAckAmount: fundAckAmountToProject + fundAckNewMintToProject,
                currentProposalAmount: actualDatum.currentProposalAmount,
            };

            console.log("The datum of the utxo getting deposited: ", projDonationDatum);
            

            const tx = await lucid!
                .newTx()
                .collectFrom(
                    [projectWithFundAckUTxO], // UTXO to spend
                    Data.to(fundRedParam)//Data.to<ProjectRedeemer>("Fund", ProjectRedeemer) // Redeemer
                )
                .payToContract(
                    projectAddress,
                    { inline: Data.to<ProjectDatum>(projDonationDatum, ProjectDatum)},
                    { lovelace: BigInt(amount) }
                )
                .payToAddress(wAddr, { [fundingAckTokenAssetClassHex]: fundAckAmountToFunder })
                .attachSpendingValidator(projectScript)
                .mintAssets( {[fundingAckTokenAssetClassHex]: fundAckNewMintToProject }, Data.to<FundingAckRedeemer>("Mint", FundingAckRedeemer))
                .attachMintingPolicy(fundingAckTokenPolicy) // This should ideally be the 'spending' token minter
                .payToContract(
                    projectAddress,
                    { inline: Data.to<ProjectDatum>(projDonationDatum, ProjectDatum)},
                    { [fundingAckTokenAssetClassHex]: fundAckNewMintToProject }
                )
                .addSignerKey(pkh)
                .complete();

            await signAndSubmitTx(tx);

            setAppState({
                ...appState,
                projectWithFundAckUTxO: undefined,
            });
        } else {
            alert("Please, deploy the project before donating to it!");
        }
        
    };

    ///////////////////////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////// EXPENDITURE PROPOSAL PROJECT ///////////////////////////////////////////

    const moveExpenditureProposal = async (amount: number, expSpendDesc: string) => {
        await getExpenditureProposalUtxO()
        if (
            wAddr &&
            lucid &&
            projectCreatorAssetClassHex &&
            projectCreatorTokPolicyIdHex &&
            projectScript &&
            projectWithExpenditurePropUTxO &&
            expenditurePropTokenAssetClassHex &&
            fundingAckTokenAssetClassHex &&
            fundingAckTokenPolicy &&
            projectAddress
        ) {
            const pkh: string =
                getAddressDetails(wAddr).paymentCredential?.hash || "";

            const lucidUtils = new Utils(lucid);

            console.log("Moving Funding Proposal from address: ", projectAddress);
            console.log("Donor to spend: ", projectWithExpenditurePropUTxO);
            console.log("Expecting prop token: ", expenditurePropTokenAssetClassHex);

            const actualDatum = Data.from<ProjectDatum>(projectWithExpenditurePropUTxO.datum, ProjectDatum);

            console.log("The datum of the utxo getting spend: ", actualDatum);

            const moveExpPropRedParam = new Constr(1, [pkh]); // The redeemer with parameters

            const expProposalTokenToFunder = BigInt(1);

            // const fundAckAmountToProject = actualDatum.fundingAckAmount - expProposalTokenToFunder;

            const fundAckNewMintToProject = BigInt(1); // Here is the expenditure spend token amount to mint 
            
            const expeSpendTokenRecipient = actualDatum.projectOwners[0];
            const expeSpendTokenRecipientCredential = lucidUtils.keyHashToCredential(expeSpendTokenRecipient);
            const expeSpendTokenRecipientAddress = lucidUtils.credentialToAddress(expeSpendTokenRecipientCredential);
            const expeSpendTokenRecipientAmt = BigInt(1);

            const proposeSpendAmount = Number(actualDatum.currentProposalAmount);

            const expenditurePropPolicyId = actualDatum.proposalTokMintingPolicyId;

            const expSpendMintAmount = BigInt(2);

            const expSpendToProjectAddress = BigInt(1);

            const { expenditureSpendingPolicy, expenditureSpendAsset } = await getFinalExpenditureSpendingPolicy(projectScript, expenditurePropPolicyId, proposeSpendAmount ,expSpendDesc);
            
            const expenditureSpendPolicyId: PolicyId = lucid!.utils.mintingPolicyToId(expenditureSpendingPolicy);

            const expSpendDatum: ProjectDatum = {
                spendingMintingPolicyId: expenditureSpendPolicyId,    // Maybe this should be a list.
                fundingAckTokMintingPolicyId: actualDatum.fundingAckTokMintingPolicyId,
                proposalTokMintingPolicyId: actualDatum.proposalTokMintingPolicyId,
                projectOwnerTokMintPolicyId: actualDatum.projectOwnerTokMintPolicyId ,
                projectFunders: actualDatum.projectFunders,
                projectOwners: actualDatum.projectOwners,
                fundingAmount: actualDatum.fundingAckAmount,
                fundingAckAmount: actualDatum.fundingAckAmount,
                currentProposalAmount: actualDatum.currentProposalAmount,
            };

            console.log("The datum of the utxo getting deposited: ", expSpendDatum)
            

            const tx = await lucid!
                .newTx()
                .collectFrom(
                    [projectWithExpenditurePropUTxO], // UTXO to spend
                    Data.to(moveExpPropRedParam)//Data.to<ProjectRedeemer>("Fund", ProjectRedeemer) // Redeemer
                )
                .payToAddress(wAddr, { [expenditurePropTokenAssetClassHex]: expProposalTokenToFunder })
                .attachSpendingValidator(projectScript) // Here we are not minting but a case could be made to mint spend tokens and send to project Creator;
                .mintAssets( {[expenditureSpendAsset]: expSpendMintAmount }, Data.void())
                .attachMintingPolicy(expenditureSpendingPolicy) 
                .payToContract(
                    projectAddress,
                    { inline: Data.to<ProjectDatum>(expSpendDatum, ProjectDatum)},
                    { [expenditureSpendAsset]: expSpendToProjectAddress }
                )
                .payToAddress(
                    expeSpendTokenRecipientAddress,
                    { [expenditureSpendAsset]: expeSpendTokenRecipientAmt}
                )
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
                    onClick={() => donateToProject(donation)}
                    disabled={
                        !lucid ||
                        !wAddr ||
                        !projectAddress ||
                        !fundingAckTokenAssetClassHex ||
                        donation === 0 
                    }
                    className="w-full rounded-lg p-3 text-zinc-50 bg-zinc-800 shadow-[0_5px_0px_0px_rgba(0,0,0,0.6)] disabled:active:translate-y-0 disabled:active:shadow-[0_5px_0px_0px_rgba(0,0,0,0.2)] disabled:bg-zinc-200  disabled:shadow-[0_5px_0px_0px_rgba(0,0,0,0.2)] disabled:text-zinc-600 font-quicksand font-bold active:translate-y-[2px] active:shadow-[0_4px_0px_0px_rgba(0,0,0,0.6)]"
                >
                    {" "}
                    Fund Project
                </button>
            </div>
            <div className="flex flex-row w-full justify-center items-center my-8 text-lg text-zinc-800 font-quicksand ">
                <p>Expenditure Spend Approval Title:</p>
                <input
                    type="string"
                    value={expSpendDesc}
                    onChange={(e) => parseExpSpendDesc(e.target.value)}
                    className="w-16 py-1 px-2 ml-2 border border-zinc-700 rounded"
                />
            </div>
            <div className="w-full flex flex-row gap-4">
                <button
                    onClick={() => moveExpenditureProposal(donation, expSpendDesc)}
                    disabled={
                        !lucid ||
                        !wAddr ||
                        !projectAddress ||
                        !fundingAckTokenAssetClassHex ||
                        expSpendDesc === null 
                    }
                    className="w-full rounded-lg p-3 text-zinc-50 bg-zinc-800 shadow-[0_5px_0px_0px_rgba(0,0,0,0.6)] disabled:active:translate-y-0 disabled:active:shadow-[0_5px_0px_0px_rgba(0,0,0,0.2)] disabled:bg-zinc-200  disabled:shadow-[0_5px_0px_0px_rgba(0,0,0,0.2)] disabled:text-zinc-600 font-quicksand font-bold active:translate-y-[2px] active:shadow-[0_4px_0px_0px_rgba(0,0,0,0.6)]"
                >
                    {" "}
                    Approve Expenditure
                </button>
            </div>
        </div>
    )        
}
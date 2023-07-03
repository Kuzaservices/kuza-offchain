import { AppStateContext } from "@/pages/_app";
import { signAndSubmitTx, findDatumUTxoAtAtScript } from "@/utilities/utilities";
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
                "590b7b590b78010000323322323232332232323232323322323232323232323232323232323232322222322232325335330053333573466e1cd55ce9baa0044800080988c98c8084cd5ce00e81300f9999ab9a3370e6aae7540092000233221233001003002323232323232323232323232323333573466e1cd55cea8062400046666666666664444444444442466666666666600201a01801601401201000e00c00a00800600466a0340366ae854030cd406806cd5d0a80599a80d00e1aba1500a3335501e75ca03a6ae854024ccd54079d7280e9aba1500833501a02435742a00e666aa03c04aeb4d5d0a8031919191999ab9a3370e6aae75400920002332212330010030023232323333573466e1cd55cea8012400046644246600200600466a05eeb4d5d0a80118181aba135744a004464c6406e66ae700cc0f00d44d55cf280089baa00135742a0046464646666ae68cdc39aab9d5002480008cc8848cc00400c008cd40bdd69aba150023030357426ae8940088c98c80dccd5ce01981e01a89aab9e5001137540026ae84d5d1280111931901999ab9c02f038031135573ca00226ea8004d5d0a80299a80d3ae35742a008666aa03c04240026ae85400cccd54079d710009aba150023023357426ae8940088c98c80bccd5ce01581a01689aba25001135744a00226ae8940044d5d1280089aba25001135744a00226ae8940044d5d1280089aba25001135744a00226aae7940044dd50009aba150023013357426ae8940088c98c8084cd5ce00e81300f881289a80524810350543500135573ca00226ea8004c888c8c94cd54cd54cd4c8c94ccd4008540a084c0840048c854cd4d400c888888888888c03400884c08c004540a8c8004d540ac894cd4004540ac884d4008894cd4ccd5cd19b8f002007024023135030001130060035003355335500113263202033573892119657870656374656420612070726f6a656374206f7574707574000252215335500313500c49010350543800221002220022101c101a101b13357389211450726f6a65637420686173206e6f20646174756d0001a15335333573466e24c8c8c8c8c8c004014c8004d540b088cd400520002235002225335333573466e3c0080240940904c01c0044c01800cc8004d540ac88cd400520002235002225335333573466e3c00801c09008c40044c01800cd401c8888004d401088cccd40048c98c8090cd5ce2481024c680002920012326320243357389201024c68000292326320243357389201024c68000293550022222222222220084800006806c406c4cd5ce24913416d6f756e74206e6f7420706f7369746976650001a101a132323500122222222222233355302a12001223500222223500422335002200825335333573466e3c00405c0c40c04cd40dccd54098014018020402140bc0294008d401088880104d400488008cccc888848cccc00401401000c008dd70021bae003375a0046eb800448c98c805ccd5ce00080e0919118011bac0013200135501e2233335573e0024a036466a03460086ae84008c00cd5d100100e919191999ab9a3370e6aae7540092000233221233001003002300b35742a004600a6ae84d5d1280111931900c19ab9c01401d016135573ca00226ea80048c8c8c8c8cccd5cd19b8735573aa00890001199991110919998008028020018011919191999ab9a3370e6aae7540092000233221233001003002301435742a00466a01c0266ae84d5d1280111931900e99ab9c01902201b135573ca00226ea8004d5d0a802199aa8043ae500735742a0066464646666ae68cdc3a800a4008464244460040086ae84d55cf280191999ab9a3370ea0049001119091118008021bae357426aae7940108cccd5cd19b875003480008488800c8c98c807ccd5ce00d81200e80e00d89aab9d5001137540026ae854008cd4029d71aba135744a004464c6403266ae7005407805c4d5d1280089aba25001135573ca00226ea80044cd54005d73ad112232230023756002640026aa03644646666aae7c008940648cd4060cd5401cc018d55cea80118029aab9e500230043574400603626ae84004448848cc00400c008488c8c8cccd5cd19b875001480008d406cc014d5d09aab9e500323333573466e1d400920022501b23263201533573802203402602426aae7540044dd5000919191999ab9a3370ea002900311909111180200298039aba135573ca00646666ae68cdc3a8012400846424444600400a60126ae84d55cf280211999ab9a3370ea006900111909111180080298039aba135573ca00a46666ae68cdc3a8022400046424444600600a6eb8d5d09aab9e500623263201533573802203402602402202026aae7540044dd5000919191999ab9a3370e6aae7540092000233221233001003002300535742a0046eb4d5d09aba2500223263201133573801a02c01e26aae7940044dd50009191999ab9a3370e6aae75400520002375c6ae84d55cf280111931900799ab9c00b01400d13754002464646464646666ae68cdc3a800a401842444444400646666ae68cdc3a8012401442444444400846666ae68cdc3a801a40104664424444444660020120106eb8d5d0a8029bad357426ae8940148cccd5cd19b875004480188cc8848888888cc008024020dd71aba15007375c6ae84d5d1280391999ab9a3370ea00a900211991091111111980300480418061aba15009375c6ae84d5d1280491999ab9a3370ea00c900111909111111180380418069aba135573ca01646666ae68cdc3a803a400046424444444600a010601c6ae84d55cf280611931900c19ab9c01401d016015014013012011010135573aa00826aae79400c4d55cf280109aab9e5001137540024646464646666ae68cdc3a800a4004466644424466600200a0080066eb4d5d0a8021bad35742a0066eb4d5d09aba2500323333573466e1d4009200023212230020033008357426aae7940188c98c8044cd5ce00680b00780709aab9d5003135744a00226aae7940044dd5000919191999ab9a3370ea002900111909118008019bae357426aae79400c8cccd5cd19b875002480008c8488c00800cdd71aba135573ca008464c6401c66ae7002804c03002c4d55cea80089baa00112232323333573466e1d400520042122200123333573466e1d40092002232122230030043006357426aae7940108cccd5cd19b87500348000848880088c98c803ccd5ce00580a00680600589aab9d5001137540024646666ae68cdc3a800a4004400a46666ae68cdc3a80124000400a464c6401666ae7001c0400240204d55ce9baa001122002122001490103505431003200135500b22112225335001100222133005002333553007120010050040012323232323232323232323333333574801646666ae68cdc39aab9d500b480008cccd55cfa8059280b11999aab9f500b25017233335573ea0164a03046666aae7d402c940648cccd55cfa8059280d11999aab9f500b2501b233335573ea0164a03846666aae7d402c940748cccd55cfa8059280f11999aab9f35744a0184a66a603a6ae854054854cd4c078d5d0a80a90a99a980f9aba15015215335302035742a02a42a66a66a03a0426ae854054854cd4cd4078088d5d0a80a90a99a98111aba15015215335302335742a02a42a66a60486ae85405484d40a448ccccccccc00402802402001c01801401000c0085409c5409854094540905408c5408854084540805407c9407c07407006c06806406005c05805405094054034940509405094050940500484d5d1280089aba25001135744a00226ae8940044d5d1280089aba25001135744a00226ae8940044d55cf280089baa00149848c88ccccccd5d20009280512805118019bac0022500a2500a008320013550092233335573e00246a016a00c4a66a60086ae84008854cd4c010d5d1001909a80699a8038010008a8058a80500408910010910911980080200191999999aba4001250052500525005235006375a0044a00a00646666666ae90004940109401094010940108d4014dd7001001090008909118010018891000889191800800911980198010010009",
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
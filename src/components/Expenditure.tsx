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
                "590b6b590b680100003233223232323322323232323233223232323232323232323232323232323222322232325335330053333573466e1cd55ce9baa0044800080908c98c807ccd5ce00d81200e9999ab9a3370e6aae7540092000233221233001003002323232323232323232323232323333573466e1cd55cea8062400046666666666664444444444442466666666666600201a01801601401201000e00c00a00800600466a0300326ae854030cd4060064d5d0a80599a80c00d1aba1500a3335501c75ca0366ae854024ccd54071d7280d9aba1500833501802235742a00e666aa038046eb4d5d0a8031919191999ab9a3370e6aae75400920002332212330010030023232323333573466e1cd55cea8012400046644246600200600466a05aeb4d5d0a80118171aba135744a004464c6406a66ae700c40e80cc4d55cf280089baa00135742a0046464646666ae68cdc39aab9d5002480008cc8848cc00400c008cd40b5d69aba15002302e357426ae8940088c98c80d4cd5ce01881d01989aab9e5001137540026ae84d5d1280111931901899ab9c02d03602f135573ca00226ea8004d5d0a80299a80c3ae35742a008666aa03803e40026ae85400cccd54071d710009aba150023021357426ae8940088c98c80b4cd5ce01481901589aba25001135744a00226ae8940044d5d1280089aba25001135744a00226ae8940044d5d1280089aba25001135744a00226aae7940044dd50009aba150023011357426ae8940088c98c807ccd5ce00d81200e881189a80424810350543500135573ca00226ea8004c888c8c94cd54cd54cd4c8c94ccd40085409884c07c0048c854cd4d400c888888888888c03400884c084004540a0c8004d540a4894cd4004540a4884d4008894cd4ccd5cd19b8f00200702202113502e001130060035003355335500113263201e33573892119657870656374656420612070726f6a656374206f7574707574000232215335500313500a49010350543800221002220022101a1018101913357389211450726f6a65637420686173206e6f20646174756d0001815335333573466e24c8c8c8c8c8c004014c8004d540a888cd400520002235002225335333573466e3c00802408c0884c01c0044c01800cc8004d540a488cd400520002235002225335333573466e3c00801c08808440044c01800cd401c88004d401088cccd40048c98c8088cd5ce2481024c680002720012326320223357389201024c68000272326320223357389201024c68000273550022222222222220084800006006440644cd5ce24913416d6f756e74206e6f7420706f736974697665000181018132323500122222222222233355302812001223500222223500422335002200825335333573466e3c00405c0bc0b84cd40d4cd54090014018020402140b40294008d4010880084d400488008cc8848cc00400c008dd70011bae00112326320173357380020382464460046eb0004c8004d5407888cccd55cf8009280d919a80d18021aba100230033574400403a464646666ae68cdc39aab9d5002480008cc8848cc00400c008c02cd5d0a80118029aba135744a004464c6403066ae700500740584d55cf280089baa0012323232323333573466e1cd55cea8022400046666444424666600200a0080060046464646666ae68cdc39aab9d5002480008cc8848cc00400c008c050d5d0a80119a8070099aba135744a004464c6403a66ae7006408806c4d55cf280089baa00135742a008666aa010eb9401cd5d0a8019919191999ab9a3370ea0029002119091118010021aba135573ca00646666ae68cdc3a80124004464244460020086eb8d5d09aab9e500423333573466e1d400d20002122200323263201f33573803604803a03803626aae7540044dd50009aba1500233500a75c6ae84d5d1280111931900c99ab9c01501e017135744a00226ae8940044d55cf280089baa0011335500175ceb44488c88c008dd5800990009aa80d91191999aab9f0022501923350183355007300635573aa004600a6aae794008c010d5d100180d89aba10011122123300100300212232323333573466e1d4005200023501b3005357426aae79400c8cccd5cd19b875002480089406c8c98c8054cd5ce00880d00980909aab9d500113754002464646666ae68cdc3a800a400c46424444600800a600e6ae84d55cf280191999ab9a3370ea004900211909111180100298049aba135573ca00846666ae68cdc3a801a400446424444600200a600e6ae84d55cf280291999ab9a3370ea00890001190911118018029bae357426aae7940188c98c8054cd5ce00880d00980900880809aab9d500113754002464646666ae68cdc39aab9d5002480008cc8848cc00400c008c014d5d0a8011bad357426ae8940088c98c8044cd5ce00680b00789aab9e5001137540024646666ae68cdc39aab9d5001480008dd71aba135573ca004464c6401e66ae7002c0500344dd5000919191919191999ab9a3370ea002900610911111100191999ab9a3370ea004900510911111100211999ab9a3370ea00690041199109111111198008048041bae35742a00a6eb4d5d09aba2500523333573466e1d40112006233221222222233002009008375c6ae85401cdd71aba135744a00e46666ae68cdc3a802a400846644244444446600c01201060186ae854024dd71aba135744a01246666ae68cdc3a8032400446424444444600e010601a6ae84d55cf280591999ab9a3370ea00e900011909111111180280418071aba135573ca018464c6403066ae7005007405805405004c0480440404d55cea80209aab9e5003135573ca00426aae7940044dd50009191919191999ab9a3370ea002900111999110911998008028020019bad35742a0086eb4d5d0a8019bad357426ae89400c8cccd5cd19b875002480008c8488c00800cc020d5d09aab9e500623263201133573801a02c01e01c26aae75400c4d5d1280089aab9e500113754002464646666ae68cdc3a800a400446424460020066eb8d5d09aab9e500323333573466e1d400920002321223002003375c6ae84d55cf280211931900719ab9c00a01300c00b135573aa00226ea8004488c8c8cccd5cd19b87500148010848880048cccd5cd19b875002480088c84888c00c010c018d5d09aab9e500423333573466e1d400d20002122200223263200f33573801602801a01801626aae7540044dd50009191999ab9a3370ea0029001100291999ab9a3370ea0049000100291931900599ab9c007010009008135573a6ea800448800848800524103505431003200135500b22112225335001100222133005002333553007120010050040012323232323232323232323333333574801646666ae68cdc39aab9d500b480008cccd55cfa8059280b11999aab9f500b25017233335573ea0164a03046666aae7d402c940648cccd55cfa8059280d11999aab9f500b2501b233335573ea0164a03846666aae7d402c940748cccd55cfa8059280f11999aab9f35744a0184a66a603a6ae854054854cd4c078d5d0a80a90a99a980f9aba15015215335302035742a02a42a66a66a03a0426ae854054854cd4cd4078088d5d0a80a90a99a98111aba15015215335302335742a02a42a66a60486ae85405484d40a448ccccccccc00402802402001c01801401000c0085409c5409854094540905408c5408854084540805407c9407c07407006c06806406005c05805405094054034940509405094050940500484d5d1280089aba25001135744a00226ae8940044d5d1280089aba25001135744a00226ae8940044d55cf280089baa00149848c88ccccccd5d20009280512805118019bac0022500a2500a008320013550092233335573e00246a016a00c4a66a60086ae84008854cd4c010d5d1001909a80699a8038010008a8058a80500408910010910911980080200191999999aba4001250052500525005235006375a0044a00a00646666666ae90004940109401094010940108d4014dd7001001090008909118010018891000889191800800911980198010010009",
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
                "5909375909340100003232332232323232323232323232323322323232323222232232232325335330063333573466e1d401120042122200323333573466e1d401520022122200123333573466e1d401920002122200223263201e33573804203c0380360346666ae68cdc39aab9d5002480008cc8848cc00400c008c8c8c8c8c8c8c8c8c8c8c8c8c8cccd5cd19b8735573aa018900011999999999999111111111110919999999999980080680600580500480400380300280200180119a80c80d1aba1500c33501901a35742a01666a0320366ae854028ccd54075d7280e1aba150093335501d75ca0386ae854020cd4064090d5d0a803999aa80e812bad35742a00c6464646666ae68cdc39aab9d5002480008cc8848cc00400c008c8c8c8cccd5cd19b8735573aa004900011991091980080180119a817bad35742a00460606ae84d5d1280111931901919ab9c035032030135573ca00226ea8004d5d0a8011919191999ab9a3370e6aae754009200023322123300100300233502f75a6ae854008c0c0d5d09aba2500223263203233573806a06406026aae7940044dd50009aba135744a004464c6405c66ae700c40b80b04d55cf280089baa00135742a00a66a032eb8d5d0a802199aa80e81090009aba150033335501d75c40026ae854008c08cd5d09aba2500223263202a33573805a05405026ae8940044d5d1280089aba25001135744a00226ae8940044d5d1280089aba25001135744a00226ae8940044d5d1280089aab9e5001137540026ae854008c04cd5d09aba2500223263201c33573803e0380342036264c6403666ae712401035054350001b135573ca00226ea80044d55ce9baa001322232325333500415335333573466e214009200001c01b101c13357389211b4d696e74696e6720696e7374656164206f66206275726e696e67210001b1533553355001101c13357389211e6d696e74656420616d6f756e74206d75737420626520706f7369746976650001b15335333573466e1d4008d401488800807006c40704cd5ce24913496e76616c6964206d696e7420616d6f756e740001b101b153355001101c13357389211e6d696e74656420616d6f756e74206d75737420626520706f7369746976650001b1333573466e254005200001a01b13232323232300100532001355020223350014800088d4008894cd4ccd5cd19b8f00200902402313007001130060033200135501f223350014800088d4008894cd4ccd5cd19b8f0020070230221001130060033500522200135002223333500123263201c335738921024c680001c200123263201c3357389201024c680001c23263201c3357389201024c680001c35350012200222222222222200833322212333001004003002375c0066eb4008dd70008919118011bac001320013550162233335573e0024a014466a01260086ae84008c00cd5d100100a119191999ab9a3370e6aae7540092000233221233001003002300c35742a004600a6ae84d5d1280111931900a19ab9c017014012135573ca00226ea80048c8c8c8c8cccd5cd19b8735573aa00890001199991110919998008028020018011919191999ab9a3370e6aae7540092000233221233001003002301535742a00466a01e0286ae84d5d1280111931900c99ab9c01c019017135573ca00226ea8004d5d0a802199aa8043ae500735742a0066464646666ae68cdc3a800a4008464244460040086ae84d55cf280191999ab9a3370ea0049001119091118008021bae357426aae7940108cccd5cd19b875003480008488800c8c98c806ccd5ce00f00d80c80c00b89aab9d5001137540026ae854008cd402dd71aba135744a004464c6402a66ae7006005404c4d5d1280089aba25001135573ca00226ea80044cd54005d73ad112232230023756002640026aa02644646666aae7c008940208cd401ccc8848cc00400c008c018d55cea80118029aab9e500230043574400602426ae840044488008488488cc00401000c488c8c8cccd5cd19b875001480008c8488c00800cc014d5d09aab9e500323333573466e1d40092002212200123263201033573802602001c01a26aae7540044dd5000919191999ab9a3370ea002900311909111180200298039aba135573ca00646666ae68cdc3a8012400846424444600400a60126ae84d55cf280211999ab9a3370ea006900111909111180080298039aba135573ca00a46666ae68cdc3a8022400046424444600600a6eb8d5d09aab9e500623263201033573802602001c01a01801626aae7540044dd5000919191999ab9a3370e6aae7540092000233221233001003002300535742a0046eb4d5d09aba2500223263200c33573801e01801426aae7940044dd50009191999ab9a3370e6aae75400520002375c6ae84d55cf280111931900519ab9c00d00a00813754002464646464646666ae68cdc3a800a401842444444400646666ae68cdc3a8012401442444444400846666ae68cdc3a801a40104664424444444660020120106eb8d5d0a8029bad357426ae8940148cccd5cd19b875004480188cc8848888888cc008024020dd71aba15007375c6ae84d5d1280391999ab9a3370ea00a900211991091111111980300480418061aba15009375c6ae84d5d1280491999ab9a3370ea00c900111909111111180380418069aba135573ca01646666ae68cdc3a803a400046424444444600a010601c6ae84d55cf280611931900999ab9c01601301101000f00e00d00c00b135573aa00826aae79400c4d55cf280109aab9e5001137540024646464646666ae68cdc3a800a4004466644424466600200a0080066eb4d5d0a8021bad35742a0066eb4d5d09aba2500323333573466e1d4009200023212230020033008357426aae7940188c98c8030cd5ce00780600500489aab9d5003135744a00226aae7940044dd5000919191999ab9a3370ea002900111909118008019bae357426aae79400c8cccd5cd19b875002480008c8488c00800cdd71aba135573ca008464c6401266ae7003002401c0184d55cea80089baa00112232323333573466e1d400520042122200123333573466e1d40092002232122230030043006357426aae7940108cccd5cd19b87500348000848880088c98c8028cd5ce00680500400380309aab9d5001137540024646666ae68cdc3a800a4004400e46666ae68cdc3a80124000400e464c6400c66ae7002401801000c4d55ce9baa001498480044880084880052410350543100112323001001223300330020020011",
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
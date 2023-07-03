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
                "59090b5909080100003233223322323232323232323232323232323232323232323232222322232325335330053333573466e1cd55ce9baa0044800080688c98c8068cd5ce00d80d00c1999ab9a3370e6aae7540092000233221233001003002323232323232323232323232323333573466e1cd55cea8062400046666666666664444444444442466666666666600201a01801601401201000e00c00a00800600466a0300326ae854030cd4060064d5d0a80599a80c00d1aba1500a3335501c75ca0366ae854024ccd54071d7280d9aba1500833501802235742a00e666aa038046eb4d5d0a8031919191999ab9a3370e6aae75400920002332212330010030023232323333573466e1cd55cea8012400046644246600200600466a05aeb4d5d0a80118171aba135744a004464c6406066ae700c40c00b84d55cf280089baa00135742a0046464646666ae68cdc39aab9d5002480008cc8848cc00400c008cd40b5d69aba15002302e357426ae8940088c98c80c0cd5ce01881801709aab9e5001137540026ae84d5d1280111931901619ab9c02d02c02a135573ca00226ea8004d5d0a80299a80c3ae35742a008666aa03803c40026ae85400cccd54071d710009aba150023021357426ae8940088c98c80a0cd5ce01481401309aba25001135744a00226ae8940044d5d1280089aba25001135744a00226ae8940044d5d1280089aba25001135744a00226aae7940044dd50009aba150023010357426ae8940088c98c8068cd5ce00d80d00c080c89931900c99ab9c49010350543500019135573ca00226ea8004c8c888c94cd54cd4ccd54c06c48004c8c848cc00488ccd401488008008004008d40048800448cc004894cd40084088400407c8c94cd4ccd5cd19b8f350012200235007220020210201333573466e1cd400488004d401c880040840804080d400488008d54004888888888888030407c4cd5ce249105554784f206e6f20636f6e73756d65640001e153355335323301d5022001355001222222222222008101e22135002222533500415335333573466e3c00802409008c4ccd5cd19b870014800809008c408c884094407c4cd5ce24811357726f6e6720616d6f756e74206d696e7465640001e101e13500122002375c00466018640026eb800cdd68010919118011bac0013200135501a2233335573e0024a038466a03660086ae84008c00cd5d1001009919191999ab9a3370e6aae7540092000233221233001003002300a35742a004600a6ae84d5d1280111931900999ab9c014013011135573ca00226ea80048c8c8c8c8cccd5cd19b8735573aa00890001199991110919998008028020018011919191999ab9a3370e6aae7540092000233221233001003002301435742a00466a01a0266ae84d5d1280111931900c19ab9c019018016135573ca00226ea8004d5d0a802199aa8043ae500735742a0066464646666ae68cdc3a800a4008464244460040086ae84d55cf280191999ab9a3370ea0049001119091118008021bae357426aae7940108cccd5cd19b875003480008488800c8c98c8068cd5ce00d80d00c00b80b09aab9d5001137540026ae854008cd4025d71aba135744a004464c6402866ae700540500484d5d1280089aba25001135573ca00226ea80044cd54005d73ad112232230023756002640026aa02e44646666aae7c008940688cd4064cc8848cc00400c008c018d55cea80118029aab9e500230043574400602226ae84004488c8c8cccd5cd19b875001480008c8488c00800cc014d5d09aab9e500323333573466e1d40092002212200123263201133573802402201e01c26aae7540044dd5000919191999ab9a3370ea002900311909111180200298041aba135573ca00646666ae68cdc3a8012400846424444600400a60146ae84d55cf280211999ab9a3370ea006900111909111180080298039aba135573ca00a46666ae68cdc3a8022400046424444600600a6eb8d5d09aab9e500623263201133573802402201e01c01a01826aae7540044dd5000919191999ab9a3370e6aae7540092000233005300635742a0046eb4d5d09aba2500223263200d33573801c01a01626aae7940044dd50009109198008018011191999ab9a3370e6aae75400520002375c6ae84d55cf280111931900519ab9c00b00a00813754002464646464646666ae68cdc3a800a401842444444400646666ae68cdc3a8012401442444444400846666ae68cdc3a801a40104664424444444660020120106eb8d5d0a8029bad357426ae8940148cccd5cd19b875004480188cc8848888888cc008024020dd71aba15007375c6ae84d5d1280391999ab9a3370ea00a900211991091111111980300480418061aba15009375c6ae84d5d1280491999ab9a3370ea00c900111909111111180380418069aba135573ca01646666ae68cdc3a803a400046424444444600a010601c6ae84d55cf280611931900999ab9c01401301101000f00e00d00c00b135573aa00826aae79400c4d55cf280109aab9e5001137540024646464646666ae68cdc3a800a4004466644424466600200a0080066eb4d5d0a8021bad35742a0066eb4d5d09aba2500323333573466e1d4009200023212230020033008357426aae7940188c98c8030cd5ce00680600500489aab9d5003135744a00226aae7940044dd5000919191999ab9a3370ea002900111909118008019bae357426aae79400c8cccd5cd19b875002480008c8488c00800cdd71aba135573ca008464c6401266ae7002802401c0184d55cea80089baa00112232323333573466e1d400520042122200123333573466e1d40092002232122230030043006357426aae7940108cccd5cd19b87500348000848880088c98c8028cd5ce00580500400380309aab9d5001137540024646666ae68cdc3a800a4004401646666ae68cdc3a801240004016464c6400c66ae7001c01801000c4d55ce9baa00149848005241035054310032001355007221122253350011350032200122133350052200230040023335530071200100500400132001355006222533500110022213500222330073330080020060010033200135500522225335001100222135002225335333573466e1c005200000a0091333008007006003133300800733500b123330010080030020060031220021220011122002122122330010040031123230010012233003300200200101",
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
                "5909375909340100003232332232323232323232323232323322323232323222232232232325335330063333573466e1d401120042122200323333573466e1d401520022122200123333573466e1d401920002122200223263201e33573804203c0380360346666ae68cdc39aab9d5002480008cc8848cc00400c008c8c8c8c8c8c8c8c8c8c8c8c8c8cccd5cd19b8735573aa018900011999999999999111111111110919999999999980080680600580500480400380300280200180119a80c80d1aba1500c33501901a35742a01666a0320366ae854028ccd54075d7280e1aba150093335501d75ca0386ae854020cd4064090d5d0a803999aa80e812bad35742a00c6464646666ae68cdc39aab9d5002480008cc8848cc00400c008c8c8c8cccd5cd19b8735573aa004900011991091980080180119a817bad35742a00460606ae84d5d1280111931901919ab9c035032030135573ca00226ea8004d5d0a8011919191999ab9a3370e6aae754009200023322123300100300233502f75a6ae854008c0c0d5d09aba2500223263203233573806a06406026aae7940044dd50009aba135744a004464c6405c66ae700c40b80b04d55cf280089baa00135742a00a66a032eb8d5d0a802199aa80e81090009aba150033335501d75c40026ae854008c08cd5d09aba2500223263202a33573805a05405026ae8940044d5d1280089aba25001135744a00226ae8940044d5d1280089aba25001135744a00226ae8940044d5d1280089aab9e5001137540026ae854008c04cd5d09aba2500223263201c33573803e0380342036264c6403666ae712401035054350001b135573ca00226ea80044d55ce9baa001322232325333500415335333573466e214009200001c01b101c13357389211b4d696e74696e6720696e7374656164206f66206275726e696e67210001b1533553355001101c13357389211e6d696e74656420616d6f756e74206d75737420626520706f7369746976650001b15335333573466e1d4008d401488800807006c40704cd5ce24913496e76616c6964206d696e7420616d6f756e740001b101b153355001101c13357389211e6d696e74656420616d6f756e74206d75737420626520706f7369746976650001b1333573466e254005200001a01b13232323232300100532001355020223350014800088d4008894cd4ccd5cd19b8f00200902402313007001130060033200135501f223350014800088d4008894cd4ccd5cd19b8f0020070230221001130060033500522200135002223333500123263201c335738921024c680001c200123263201c3357389201024c680001c23263201c3357389201024c680001c35350012200222222222222200833322212333001004003002375c0066eb4008dd70008919118011bac001320013550162233335573e0024a014466a01260086ae84008c00cd5d100100a119191999ab9a3370e6aae7540092000233221233001003002300c35742a004600a6ae84d5d1280111931900a19ab9c017014012135573ca00226ea80048c8c8c8c8cccd5cd19b8735573aa00890001199991110919998008028020018011919191999ab9a3370e6aae7540092000233221233001003002301535742a00466a01e0286ae84d5d1280111931900c99ab9c01c019017135573ca00226ea8004d5d0a802199aa8043ae500735742a0066464646666ae68cdc3a800a4008464244460040086ae84d55cf280191999ab9a3370ea0049001119091118008021bae357426aae7940108cccd5cd19b875003480008488800c8c98c806ccd5ce00f00d80c80c00b89aab9d5001137540026ae854008cd402dd71aba135744a004464c6402a66ae7006005404c4d5d1280089aba25001135573ca00226ea80044cd54005d73ad112232230023756002640026aa02644646666aae7c008940208cd401ccc8848cc00400c008c018d55cea80118029aab9e500230043574400602426ae840044488008488488cc00401000c488c8c8cccd5cd19b875001480008c8488c00800cc014d5d09aab9e500323333573466e1d40092002212200123263201033573802602001c01a26aae7540044dd5000919191999ab9a3370ea002900311909111180200298039aba135573ca00646666ae68cdc3a8012400846424444600400a60126ae84d55cf280211999ab9a3370ea006900111909111180080298039aba135573ca00a46666ae68cdc3a8022400046424444600600a6eb8d5d09aab9e500623263201033573802602001c01a01801626aae7540044dd5000919191999ab9a3370e6aae7540092000233221233001003002300535742a0046eb4d5d09aba2500223263200c33573801e01801426aae7940044dd50009191999ab9a3370e6aae75400520002375c6ae84d55cf280111931900519ab9c00d00a00813754002464646464646666ae68cdc3a800a401842444444400646666ae68cdc3a8012401442444444400846666ae68cdc3a801a40104664424444444660020120106eb8d5d0a8029bad357426ae8940148cccd5cd19b875004480188cc8848888888cc008024020dd71aba15007375c6ae84d5d1280391999ab9a3370ea00a900211991091111111980300480418061aba15009375c6ae84d5d1280491999ab9a3370ea00c900111909111111180380418069aba135573ca01646666ae68cdc3a803a400046424444444600a010601c6ae84d55cf280611931900999ab9c01601301101000f00e00d00c00b135573aa00826aae79400c4d55cf280109aab9e5001137540024646464646666ae68cdc3a800a4004466644424466600200a0080066eb4d5d0a8021bad35742a0066eb4d5d09aba2500323333573466e1d4009200023212230020033008357426aae7940188c98c8030cd5ce00780600500489aab9d5003135744a00226aae7940044dd5000919191999ab9a3370ea002900111909118008019bae357426aae79400c8cccd5cd19b875002480008c8488c00800cdd71aba135573ca008464c6401266ae7003002401c0184d55cea80089baa00112232323333573466e1d400520042122200123333573466e1d40092002232122230030043006357426aae7940108cccd5cd19b87500348000848880088c98c8028cd5ce00680500400380309aab9d5001137540024646666ae68cdc3a800a4004400e46666ae68cdc3a80124000400e464c6400c66ae7002401801000c4d55ce9baa001498480044880084880052410350543100112323001001223300330020020011",
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
import { MintProjectOwnerToken, MintFundingAckInitialTokens } from "../components/TokenMint";
import Project from "@/components/Project";
import Donor from "@/components/Donor";
import { useContext } from "react";
import { AppStateContext } from "./_app";
import { HiUserCircle } from "react-icons/hi";
import { IoReloadCircleSharp } from "react-icons/io5";

import { useState } from "react";
import { Data, fromHex } from "lucid-cardano";


export default function Home() {
    type Person = "donor" | "user" | "owner";
    const [isPerson, setIsPerson] = useState<Person>("owner");
    const { appState, setAppState } = useContext(AppStateContext);
    const {
        wAddr,
        // scPolicyIdHex,
        // scAssetClassHex,
        // oracleWithNftUTxO,
        // oracleAddress,
        // minPercent,
        // txScriptsDeployment,
    } = appState;

    const refreshWallet = async () => {
        if (!appState.lucid || !window.cardano.nami) return;
        const nami = await window.cardano.nami.enable();
        appState.lucid.selectWallet(nami);
        setAppState({
            ...appState,
            wAddr: await appState.lucid.wallet.address(),
        });
    };

    const handleClick = (v: Person) => {
        if (v === "donor") {
            setIsPerson("donor");
        } else if (v === "user") {
            setIsPerson("user");
        } else {
            setIsPerson("owner");
        }
        console.log(isPerson);
    };

    return (
        <main className="flex min-h-screen w-screen h-screen gap-6 flex-row-reverse items-center justify-between px-5 pb-5  pt-20 bg-zinc-800">
            <div className="flex flex-col items-center justify-start  w-[380px] mt-2">
                {/* USER LOGGED */}
                <div className="absolute justify-center items-center right-0 top-5 bg-zinc-50  h-12  w-48 rounded-l-2xl flex flex-row">
                    <HiUserCircle
                        className="text-4xl text-zinc-600"
                        onClick={refreshWallet}
                    />
                    <p className="text-lg mx-2 text-zinc-800">
                        {wAddr ? `...${wAddr.substring(102)}` : ""}
                    </p>
                    <IoReloadCircleSharp
                        className="text-3xl mx-2 text-zinc-600 active:text-zinc-800"
                        onClick={refreshWallet}
                    />
                </div>
            </div>

            {/* PERSON BUTTONS */}
            <div className="absolute top-4 left-5 flex flex-row gap-4">
                <button
                    onClick={() => handleClick("donor")}
                    className={`${
                        isPerson == "donor"
                            ? "bg-zinc-100 text-zinc-800 shadow-[0_5px_0px_0px_rgba(255,251,251,0.6)]"
                            : "bg-zinc-900 text-zinc-50 shadow-[0_5px_0px_0px_rgba(0,0,0,0.6)]"
                    } font-quicksand text-lg font-bold py-3 px-8 rounded-lg active:translate-y-[2px] active:shadow-[0_4px_0px_0px_rgba(0,0,0,0.6)] `}
                >
                    Donor
                </button>
                <button
                    onClick={() => handleClick("owner")}
                    className={`${
                        isPerson == "owner"
                            ? "bg-zinc-100 text-zinc-800 shadow-[0_5px_0px_0px_rgba(255,251,251,0.6)]"
                            : "bg-zinc-900 text-zinc-50 shadow-[0_5px_0px_0px_rgba(0,0,0,0.6)]"
                    }  font-quicksand text-lg font-bold py-3 px-8 rounded-lg active:translate-y-[2px] active:shadow-[0_4px_0px_0px_rgba(0,0,0,0.6)] `}
                >
                    Owner
                </button>
                <button
                    onClick={() => handleClick("user")}
                    className={`${
                        isPerson == "user"
                            ? "bg-zinc-100 text-zinc-800 shadow-[0_5px_0px_0px_rgba(255,251,251,0.6)]"
                            : "bg-zinc-900 text-zinc-50 shadow-[0_5px_0px_0px_rgba(0,0,0,0.6)]"
                    }  font-quicksand text-lg font-bold py-3 px-8 rounded-lg active:translate-y-[2px] active:shadow-[0_4px_0px_0px_rgba(0,0,0,0.6)] `}
                >
                    User
                </button>
            </div>

            {/* ACTIONS SECTION */}
            <div className="flex flex-col items-center gap-8  h-full py-10 bg-zinc-50 w-4/5 rounded-2xl">
                {/* OWNER ACTIONS */}
                {isPerson == "owner" && (
                    <div className="shadow-[0_4px_0px_0px_rgba(0,0,0,0.25)] w-[664px] bg-zinc-50 border border-zinc-600 rounded-xl p-9">
                        <MintProjectOwnerToken />
                        <MintFundingAckInitialTokens/>
                        <Project />
                    </div>
                )}

                {/* DONOR ACTIONS */}
                {isPerson == "donor" && (
                    <div className="shadow-[0_4px_0px_0px_rgba(0,0,0,0.25)] w-[664px] bg-zinc-50 border border-zinc-600 rounded-xl px-9 pb-9">
                        <Donor />
                    </div>
                )}

                {/* USER ACTIONS */}
                {isPerson == "donor" && (
                    <div className="shadow-[0_4px_0px_0px_rgba(0,0,0,0.25)] w-[664px] bg-zinc-50 border border-zinc-600 rounded-xl px-9 pb-9">
                        
                    </div>
                )}
            </div>
        </main>
    );
}    
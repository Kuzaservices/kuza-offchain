import { PolicyId, UTxO, Unit } from "lucid-cardano";
import React, { useContext } from "react";
import {
    applyParamsToScript,
    Data,
    MintingPolicy,
    fromText,
} from "lucid-cardano";
import { AppStateContext } from "@/pages/_app";
import { signAndSubmitTx } from "@/utilities/utilities";

export default function MintExpenditureSpendingToken() {


}
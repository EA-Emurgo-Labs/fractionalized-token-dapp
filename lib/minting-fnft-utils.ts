import { Lucid, MintingPolicy, PolicyId, TxHash, Unit, utf8ToHex, Data, UTxO, Constr, Script } from "lucid-cardano"
import { Int } from "lucid-cardano/types/src/core/wasm_modules/cardano_multiplatform_lib_web/cardano_multiplatform_lib"

interface BurnOptions {
  lucid: Lucid
  address: string
  unitNFT: string
  mintingPolicy: MintingPolicy,
  redeemerBurnFNFT: string,
  unitFNFT: string,
  utxo: UTxO,
  fnftScript: Script,
  fnftAmount: number
}

interface MintOptions {
  lucid: Lucid
  address: string
  unitNFT: string
  mintingPolicy: MintingPolicy,
  redeemerMintFNFT: string,
  tokenFNFTName: string,
  utxo: UTxO,
  fnftAmount: number
}

// fully qualified asset name, hex encoded policy id + name
const getUnit = (policyId: PolicyId, name: string): Unit => policyId + utf8ToHex(name)

const getMintingPolicy = (lucid: Lucid, address: string) => {
  const { paymentCredential } = lucid.utils.getAddressDetails(address)

  const mintingPolicy: MintingPolicy = lucid.utils.nativeScriptFromJson({
    type: "all",
    scripts: [{ type: "sig", keyHash: paymentCredential?.hash! }],
  })

  return mintingPolicy
}

export const getPolicyId = (lucid: Lucid, mintingPolicy: MintingPolicy) => {
  const policyId: PolicyId = lucid.utils.mintingPolicyToId(mintingPolicy)

  return policyId
}

export const mintFNFT = async ({ lucid, address, unitNFT, mintingPolicy, redeemerMintFNFT, tokenFNFTName, utxo, fnftAmount}: MintOptions): Promise<TxHash> => {
  const policyId = getPolicyId(lucid, mintingPolicy)
  const unitFNFT =  policyId + tokenFNFTName
  const unitValidation = getUnit(policyId, 'FNFT_VALIDITY')
  console.log(fnftAmount)
  let fnftAmountParam = BigInt(fnftAmount)

  const datum = Data.to(
    new Constr(0, [ policyId,tokenFNFTName, fnftAmountParam, unitNFT.substring(0,56), unitNFT.substring(56), fnftAmountParam])
  );

  const tx = await lucid
    .newTx()
    .readFrom([utxo])
    .mintAssets({ [unitFNFT]: fnftAmountParam, [unitValidation]: 1n}, redeemerMintFNFT)
    .attachMintingPolicy(mintingPolicy)
    .payToContract(address, {inline: datum} ,{ [unitFNFT]: fnftAmountParam, [unitValidation]: 1n, [unitNFT]: 1n})
    .complete()

  const signedTx = await tx.sign().complete()

  const txHash = await signedTx.submit()

  return txHash
}

export const burnFNFT = async ({ lucid, address, unitNFT, mintingPolicy, redeemerBurnFNFT, unitFNFT, utxo, fnftScript, fnftAmount }: BurnOptions): Promise<TxHash> => {
  const policyId = getPolicyId(lucid, mintingPolicy)
  // const unitFNFT =  "ed0ac7e51d2ad9b7e0118a98ed574033a6a9cf9079e125ac29e0fc5c" + "9e06e052de79ac4e2df08e8076bb97b52bc200e12ff350101abd37c1b66de95c"
  const unitValidation = getUnit(policyId, 'FNFT_VALIDITY')
  let fnftAmountParam = BigInt(-fnftAmount)

  const tx = await lucid
  .newTx()
  .readFrom([utxo])
  .collectFrom([utxo], redeemerBurnFNFT)
  .attachSpendingValidator(fnftScript)
  .mintAssets({ [unitFNFT]: fnftAmountParam, [unitValidation]: -1n}, redeemerBurnFNFT)
  .attachMintingPolicy(mintingPolicy)
  .payToAddress(address,{[unitNFT]: 1n})
  .complete()

  const signedTx = await tx.sign().complete()

  const txHash = await signedTx.submit()

  return txHash
}

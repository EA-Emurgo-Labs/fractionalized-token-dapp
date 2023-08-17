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

interface WithdrawOptions {
  lucid: Lucid,
  address: string,
  unitNFT: string,
  unitFNFT: string,
  redeemerWithdrawFNFT: string,
  utxo: UTxO,
  fnftAmount: number,
  fnftScript: Script,
  fnftAddress: string
}

interface DepositOptions {
  lucid: Lucid,
  address: string,
  unitNFT: string,
  unitFNFT: string,
  redeemerDepositFNFT: string,
  utxo: UTxO,
  fnftAmount: number,
  fnftScript: Script,
  fnftAddress: string,
  utxoFNFT: UTxO,
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

export const withdrawFNFT = async ({ lucid, address, unitNFT, unitFNFT, redeemerWithdrawFNFT,  utxo, fnftScript, fnftAmount, fnftAddress }: WithdrawOptions): Promise<TxHash> => {
  unitNFT = '37ab27a5bdceb3b82583b66788baa912e520c72f6df13318b22f6942' + '4e465431'
  unitFNFT = 'ed0ac7e51d2ad9b7e0118a98ed574033a6a9cf9079e125ac29e0fc5cd49ca7d8847a47a280c6140ebb63d7a5d09ebd7149040ba6d56103f134f7610f'
  fnftAddress = 'addr_test1wq4k3vzhmjdkt8pls9472hcptredft8953s284qppr8ehkcldcrx9'
  const policyId = unitFNFT.substring(0,56)
  const unitValidation = getUnit(policyId, 'FNFT_VALIDITY')
  let fnftAmountParam = BigInt(fnftAmount)
  let remain = BigInt(200 - fnftAmount)

  const datum = Data.to(
    new Constr(0, [ policyId, unitFNFT.substring(56), BigInt(200), unitNFT.substring(0,56), unitNFT.substring(56), remain])
  );

  console.log(utxo, address, fnftAmount)

  const tx = await lucid
  .newTx()
  .readFrom([utxo])
  .collectFrom([utxo], redeemerWithdrawFNFT)
  .attachSpendingValidator(fnftScript)
  .payToContract(fnftAddress, {inline: datum}, {[unitFNFT]: remain, [unitNFT]: 1n, [unitValidation]: 1n})
  .payToAddress(address,{[unitFNFT]: fnftAmountParam})
  .complete()

  const signedTx = await tx.sign().complete()

  const txHash = await signedTx.submit()

  return txHash
}

export const depositFNFT = async ({ lucid, address, unitNFT, unitFNFT, redeemerDepositFNFT,  utxo, fnftScript, fnftAmount, fnftAddress, utxoFNFT }: DepositOptions): Promise<TxHash> => {
  unitNFT = '37ab27a5bdceb3b82583b66788baa912e520c72f6df13318b22f6942' + '4e465431'
  unitFNFT = 'ed0ac7e51d2ad9b7e0118a98ed574033a6a9cf9079e125ac29e0fc5cd49ca7d8847a47a280c6140ebb63d7a5d09ebd7149040ba6d56103f134f7610f'
  fnftAddress = 'addr_test1wq4k3vzhmjdkt8pls9472hcptredft8953s284qppr8ehkcldcrx9'
  const policyId = unitFNFT.substring(0,56)
  const unitValidation = getUnit(policyId, 'FNFT_VALIDITY')
  let fnftAmountParam = BigInt(fnftAmount)
  let remain = BigInt(200)

  const datum = Data.to(
    new Constr(0, [ policyId, unitFNFT.substring(56), BigInt(200), unitNFT.substring(0,56), unitNFT.substring(56), remain])
  );

  console.log(utxoFNFT, utxo, address, fnftAmount)

  const tx = await lucid
  .newTx()
  .readFrom([utxo, utxoFNFT])
  .collectFrom([utxo], redeemerDepositFNFT)
  .attachSpendingValidator(fnftScript)
  .payToContract(fnftAddress, {inline: datum}, {[unitFNFT]: remain, [unitNFT]: 1n, [unitValidation]: 1n})
  .complete()

  const signedTx = await tx.sign().complete()

  const txHash = await signedTx.submit()

  return txHash
}

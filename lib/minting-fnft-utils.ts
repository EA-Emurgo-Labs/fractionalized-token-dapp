import { Lucid, MintingPolicy, PolicyId, TxHash, Unit, utf8ToHex, Data, UTxO, Constr, Script } from "lucid-cardano"

interface Options {
  lucid: Lucid
  address: string
  name: string
  mintingPolicy: MintingPolicy,
  redeemerMintFNFT: string,
  tokenFNFTName: string,
  utxos: UTxO[],
  fnftScript: Script
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

const getPolicyId = (lucid: Lucid, mintingPolicy: MintingPolicy) => {
  const policyId: PolicyId = lucid.utils.mintingPolicyToId(mintingPolicy)

  return policyId
}

export const mintFNFT = async ({ lucid, address, name, mintingPolicy, redeemerMintFNFT, tokenFNFTName, utxos, fnftScript }: Options): Promise<TxHash> => {
  const policyId = getPolicyId(lucid, mintingPolicy)
  const unitFNFT =  policyId + tokenFNFTName
  const unitValidation = getUnit(policyId, 'FNFT_VALIDITY')
  const unitNFT = getUnit("37ab27a5bdceb3b82583b66788baa912e520c72f6df13318b22f6942","nft1")
  console.log(tokenFNFTName)

  const datum = Data.to(
    new Constr(0, [ policyId,tokenFNFTName, 1000n, "37ab27a5bdceb3b82583b66788baa912e520c72f6df13318b22f6942", utf8ToHex("nft1"), 1000n])
  );

  const tx = await lucid
    .newTx()
    .readFrom([utxos[1]])
    .mintAssets({ [unitFNFT]: 1000n, [unitValidation]: 1n}, redeemerMintFNFT)
    .attachMintingPolicy(mintingPolicy)
    .payToContract(address, {inline: datum} ,{ [unitFNFT]: 1000n, [unitValidation]: 1n, [unitNFT]: 1n})
    .complete()

  const signedTx = await tx.sign().complete()

  const txHash = await signedTx.submit()

  return txHash
}

export const burnFNFT = async ({ lucid, address, name, mintingPolicy, redeemerMintFNFT, tokenFNFTName, utxos, fnftScript }: Options): Promise<TxHash> => {
  const policyId = getPolicyId(lucid, mintingPolicy)
  const unit = getUnit(policyId, name)

  const unitFNFT =  "ed0ac7e51d2ad9b7e0118a98ed574033a6a9cf9079e125ac29e0fc5c" + "9e06e052de79ac4e2df08e8076bb97b52bc200e12ff350101abd37c1b66de95c"
  const unitValidation = getUnit(policyId, 'FNFT_VALIDITY')
  const unitNFT = getUnit("37ab27a5bdceb3b82583b66788baa912e520c72f6df13318b22f6942","nft1")
  console.log(tokenFNFTName)

  const datum = Data.to(
    new Constr(0, [ policyId,tokenFNFTName, 1000n, "37ab27a5bdceb3b82583b66788baa912e520c72f6df13318b22f6942", utf8ToHex("nft1"), 1000n])
  );
  const tx = await lucid

  .newTx()
  .readFrom([utxos[0]])
  .collectFrom([utxos[0]], redeemerMintFNFT)
  .attachSpendingValidator(fnftScript)
  .mintAssets({ [unitFNFT]: -1000n, [unitValidation]: -1n}, redeemerMintFNFT)
  .attachMintingPolicy(mintingPolicy)
  .payToAddress(address,{[unitNFT]: 1n})
  .complete()

  const signedTx = await tx.sign().complete()

  const txHash = await signedTx.submit()

  return txHash
}

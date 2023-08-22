import { Lucid, MintingPolicy, PolicyId, TxHash, Unit, utf8ToHex, Data, UTxO, Constr, Script } from "lucid-cardano"

interface BurnOptions {
  lucid: Lucid
  address: string
  mintingPolicy: MintingPolicy,
  redeemerBurnFNFT: string,
  utxo: UTxO,
  fnftScript: Script,
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
  redeemerWithdrawFNFT: string,
  utxo: UTxO,
  fnftAmount: number,
  fnftScript: Script,
  fnftAddress: string
}

interface DepositOptions {
  lucid: Lucid,
  address: string,
  redeemerDepositFNFT: string,
  utxo: UTxO,
  fnftAmount: number,
  fnftScript: Script,
  fnftAddress: string
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

export const burnFNFT = async ({ lucid, address, mintingPolicy, redeemerBurnFNFT, utxo, fnftScript }: BurnOptions): Promise<TxHash> => {
  let datumBN = await lucid.datumOf(utxo);
  let datumObject: Constr<string> = Data.from(datumBN);
  let fields = datumObject.fields;
  let unitFNFT = fields[0] + fields[1];
  let unitNFT = fields[3] + fields[4];
  const policyId = unitFNFT.substring(0,56)
  let minted = BigInt(fields[2]);
  let fnftAmountParam = BigInt(-minted)
  const unitValidation = getUnit(policyId, 'FNFT_VALIDITY')

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

export const withdrawFNFT = async ({ lucid, address, redeemerWithdrawFNFT,  utxo, fnftScript, fnftAmount, fnftAddress }: WithdrawOptions): Promise<TxHash> => {
  fnftAddress = 'addr_test1wq4k3vzhmjdkt8pls9472hcptredft8953s284qppr8ehkcldcrx9'
 
  let fnftAmountParam = BigInt(fnftAmount)

  let datumBN = await lucid.datumOf(utxo);
  let datumObject: Constr<string> = Data.from(datumBN);
  let fields = datumObject.fields;
  let unitFNFT = fields[0] + fields[1];
  let unitNFT = fields[3] + fields[4];
  const policyId = unitFNFT.substring(0,56)
  let remainOld = BigInt(fields[5]);
  let minted = BigInt(fields[2]);
  let remain = remainOld - fnftAmountParam
  const unitValidation = getUnit(policyId, 'FNFT_VALIDITY')

  console.log(remainOld,minted,remain, fnftAmount)

  const datum = Data.to(
    new Constr(0, [ policyId, unitFNFT.substring(56), minted, unitNFT.substring(0,56), unitNFT.substring(56), remain])
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

export const depositFNFT = async ({ lucid, address, redeemerDepositFNFT,  utxo, fnftScript, fnftAmount, fnftAddress }: DepositOptions): Promise<TxHash> => {
  fnftAddress = 'addr_test1wq4k3vzhmjdkt8pls9472hcptredft8953s284qppr8ehkcldcrx9'
  let fnftAmountParam = BigInt(fnftAmount)

  let datumBN = await lucid.datumOf(utxo);
  let datumObject: Constr<string> = Data.from(datumBN);
  let fields = datumObject.fields;
  let unitFNFT = fields[0] + fields[1];
  let unitNFT = fields[3] + fields[4];
  const policyId = unitFNFT.substring(0,56)
  let remainOld = BigInt(fields[5]);
  let minted = BigInt(fields[2]);
  let remain = remainOld + fnftAmountParam
  const unitValidation = getUnit(policyId, 'FNFT_VALIDITY')

  const utxoUsers = await lucid.utxosAt(address);
  const utxoFNFT = utxoUsers.find((x) => {
    if (x.assets) {
      const keys = Object.keys(x.assets);
      let key = keys.find((y) => y == unitFNFT);
      if (key != undefined) {
        return true;
      }
      return false;
    }
    return false;
  });

  if(!utxoFNFT) return "";


  const datum = Data.to(
    new Constr(0, [ policyId, unitFNFT.substring(56), minted, unitNFT.substring(0,56), unitNFT.substring(56), remain])
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

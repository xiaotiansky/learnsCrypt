import { Foo } from '../../src/contracts/foo'
import { getDefaultSigner, sleep } from './util/txHelper'
import {
    StatefulNext,
    toHex,
    PubKey,
    findSig,
    MethodCallOptions,
    DefaultProvider,
} from 'scrypt-ts'
import { convertDnsToArray, createNextOutputs } from './util/dnsUtils'
import { myPrivateKey, myPublicKey } from '../utils/privateKey'

async function doProcess(
    current: Foo,
    preOutputIndex: bigint
): Promise<{
    nexts: StatefulNext<Foo>[]
}> {
    await sleep(5)
    const { tx, nexts } = await current.methods.process({
        next: createNextOutputs(current, preOutputIndex),
    })

    console.log('Foo call tx : ', tx.id)

    return Promise.resolve({
        nexts: nexts,
    })
}

async function registerDNS(dns: string) {
    // Call the convertDnsToArray function with the dns argument to get the dnsNumArray
    const dnsNumArray = convertDnsToArray(dns)

    await Foo.compile()

    //Obtain the public key of the contract creator.
    const publicKeyAuctioneer = myPublicKey

    // create a genesis instance
    const foo = new Foo(PubKey(toHex(publicKeyAuctioneer)))

    foo.bindTxBuilder('process', Foo.processTxBuilder)
    foo.bindTxBuilder('beginAuction', Foo.beginAuctionTxBuilder)

    // connect to a signer
    await foo.connect(getDefaultSigner())

    // contract deployment
    const deployTx = await foo.deploy(Foo.SATOSHIS)
    console.log('foo deploy tx:', deployTx.id)
    const { nexts } = await doProcess(foo, BigInt(0))

    // Loop through each number in the dnsNumArray and generate the next dns node using doProcess method
    let nextInstances = nexts
    for (let i = 1; i < dnsNumArray.length; i++) {
        const { nexts: newNexts } = await doProcess(
            nextInstances[dnsNumArray[i]].instance,
            BigInt(dnsNumArray[i])
        )
        nextInstances = newNexts
    }

    const { tx: beginAuctionTx, next } =
        await nextInstances[0].instance.methods.beginAuction(
            (sigReps) => findSig(sigReps, publicKeyAuctioneer),
            {
                pubKeyOrAddrToSign: publicKeyAuctioneer,
            } as MethodCallOptions<Foo>
        )

    console.log(
        `beinAuctionTx.id = ${beginAuctionTx.id} next.instance = ${next.instance}`
    )

    const { tx: bidTx, next: next1 } = await next.instance.methods.bid(
        PubKey(toHex(publicKeyAuctioneer)),
        BigInt(200)
    )

    console.log(`bidTx.id = ${bidTx}`)
}

async function beginAuction() {
    await Foo.compile()

    const provider = new DefaultProvider()

    const beginTx = await provider.getTransaction(
        'b9fb79c0dbb5170eeb5b8dcb0311b97a0b85c9c12c38c67554d85ceaa76aff21'
    )
    console.log(`${beginTx.id}`)
    const beginAuction = Foo.fromTx(beginTx, 0)
}

describe('Test SmartContract `Foo` on testnet', () => {
    it('should succeed', async () => {
        await registerDNS('d')
    })
    // it('should succeed', async () => {
    //      await beginAuction()
    // })
})

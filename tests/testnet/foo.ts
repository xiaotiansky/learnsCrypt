import { Foo } from '../../src/contracts/foo'
import { getDefaultSigner, sleep } from './util/txHelper'
import { MethodCallOptions } from 'scrypt-ts'

async function main() {
    await Foo.compile()

    // create a genesis instance
    const foo = new Foo(0n)

    foo.bindTxBuilder('process', Foo.processTxBuilder)

    // connect to a signer
    await foo.connect(getDefaultSigner())

    // contract deployment
    const deployTx = await foo.deploy(Foo.SATOSHIS)
    console.log('foo deploy tx:', deployTx.id)

    const {
        tx: callTx_1,
        nexts: nexts1,
        atInputIndex: atInputIndex1,
    } = await foo.methods.process()
    console.log('atInputIndex1 = ', atInputIndex1)
    console.log('Foo call tx 1= ', callTx_1.id)
    await sleep(5)
    console.log('Foo call tx 1: ', callTx_1.id, ', count updated to: ')

    nexts1[37].instance.preOutputIndex = BigInt(0)
    const {
        tx: callTx_2,
        nexts: nexts2,
        atInputIndex: atInputIndex2,
    } = await nexts1[37].instance.methods.process()

    console.log('atInputIndex2 = ', atInputIndex2)
    await sleep(5)
    console.log('Foo call tx 2: ', callTx_2.id, ', count updated to: ')

    nexts2[5].instance.preOutputIndex = BigInt(37)
    const {
        tx: callTx_3,
        nexts: nexts3,
        atInputIndex: atInputIndex3,
    } = await nexts2[5].instance.methods.process()

    console.log('atInputIndex3 = ', atInputIndex3)
    await sleep(5)
    console.log('Foo call tx 3: ', callTx_3.id, ', count updated to: ')

    nexts3[37].instance.preOutputIndex = BigInt(5)
    const {
        tx: callTx_4,
        nexts: nexts4,
        atInputIndex: atInputIndex4,
    } = await nexts3[37].instance.methods.process()
    await sleep(5)
    console.log('atInputIndex4 = ', atInputIndex4)
    console.log('Foo call tx 4: ', callTx_4.id, ', count updated to: ')

    nexts4[37].instance.preOutputIndex = BigInt(37)
    const {
        tx: callTx_5,
        nexts: nexts5,
        atInputIndex: atInputIndex5,
    } = await nexts4[37].instance.methods.process()
    await sleep(5)
    console.log('atInputIndex5 = ', atInputIndex4)
    console.log('Foo call tx 5: ', callTx_5.id, ', count updated to: ')

    nexts5[37].instance.preOutputIndex = BigInt(37)
    const {
        tx: callTx_6,
        nexts: nexts6,
        atInputIndex: atInputIndex6,
    } = await nexts5[37].instance.methods.process()
    await sleep(5)
    console.log('atInputIndex6 = ', atInputIndex4)
    console.log('Foo call tx 6: ', callTx_6.id, ', count updated to: ')
}

describe('Test SmartContract `Foo` on testnet', () => {
    it('should succeed', async () => {
        await main()
    })
})

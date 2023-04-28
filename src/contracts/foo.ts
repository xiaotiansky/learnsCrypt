import {
    method,
    SmartContract,
    hash256,
    assert,
    ByteString,
    SigHash,
    toByteString,
    bsv,
    MethodCallOptions,
    ContractTransaction,
    Utils,
    prop,
    StatefulNext,
} from 'scrypt-ts'
import { Address, Script, Transaction } from 'bsv'

export class Foo extends SmartContract {
    static readonly OUTPUTS_COUNT = 38
    static readonly SATOSHIS = 1

    @prop(true)
    preOutputIndex: bigint

    constructor(preOutputIndex: bigint) {
        super(...arguments)
        this.preOutputIndex = preOutputIndex
    }

    @method(SigHash.ALL)
    public process() {
        const isTerminate: boolean =
            this.preOutputIndex == BigInt(37n) &&
            this.ctx.utxo.outpoint.outputIndex == BigInt(37n)

        console.log(`isTerminate :${isTerminate}`)
        assert(
            !isTerminate,
            'No new characters can be created after two consecutive (-) characters'
        )

        this.preOutputIndex = this.ctx.utxo.outpoint.outputIndex
        const output: ByteString = this.buildStateOutput(BigInt(Foo.SATOSHIS))

        let outputs: ByteString = toByteString('')
        for (let i = 0; i < Foo.OUTPUTS_COUNT; i++) {
            outputs += output
        }

        this.debug.diffOutputs(outputs)

        assert(this.ctx.hashOutputs == hash256(outputs), 'hashOutputs mismatch')
    }

    override async buildDeployTransaction(
        utxos: Transaction.IUnspentOutput[],
        amount: number,
        changeAddress?: string | Address
    ): Promise<Transaction> {
        const deployTx = new bsv.Transaction().from(utxos).addOutput(
            new bsv.Transaction.Output({
                script: this.lockingScript,
                satoshis: amount,
            })
        )

        return deployTx
    }

    static processTxBuilder(
        current: Foo,
        options: MethodCallOptions<Foo>
    ): Promise<ContractTransaction> {
        const unsignedTx: Transaction = new Transaction().addInput(
            current.buildContractInput(options.fromUTXO)
        )

        const nextOutputs = options.next as StatefulNext<Foo>[]

        nextOutputs.forEach((n) => {
            unsignedTx.addOutput(
                new Transaction.Output({
                    script: n.instance.lockingScript,
                    satoshis: n.balance,
                })
            )
        })

        return Promise.resolve({
            tx: unsignedTx,
            atInputIndex: 0,
            nexts: nextOutputs,
        })
    }
}

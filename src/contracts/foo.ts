import {
    method,
    SmartContract,
    hash256,
    assert,
    ByteString,
    toByteString,
    bsv,
    MethodCallOptions,
    ContractTransaction,
    Utils,
    Sig,
    prop,
    StatefulNext,
    PubKey,
    hash160,
} from 'scrypt-ts'
import { Address, Transaction } from 'bsv'
import { urlToHttpOptions } from 'url'

export class Foo extends SmartContract {
    static readonly OUTPUTS_COUNT = 38
    static readonly SATOSHIS = 1
    static readonly STARTING_PRICE = 100

    @prop(true)
    preOutputIndex: bigint

    @prop(true)
    isAuctioning: boolean

    @prop(true)
    bidder: PubKey

    @prop()
    readonly auctioneer: PubKey

    constructor(auctioneer: PubKey) {
        super(...arguments)
        this.preOutputIndex = BigInt(0n)
        this.isAuctioning = false
        this.auctioneer = auctioneer
        this.bidder = auctioneer
    }

    @method()
    public process() {
        const isConsecutiveDashes: boolean =
            this.preOutputIndex == BigInt(37n) &&
            this.ctx.utxo.outpoint.outputIndex == BigInt(37n)

        console.log(`isTerminate :${isConsecutiveDashes}`)
        assert(
            !isConsecutiveDashes,
            "After the consecutive '-' character, another consecutive '-' character cannot appear continuously."
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

    @method()
    public beginAuction(sig: Sig) {
        const isCanBeginAuction: boolean =
            this.preOutputIndex == BigInt(0n) &&
            this.ctx.utxo.outpoint.outputIndex == BigInt(0n)

        assert(
            isCanBeginAuction,
            "The first output after the '.' character represents the ownership of the DNS domain name."
        )

        this.isAuctioning = true

        //Auction contract transfer here.
        const output = this.buildStateOutput(BigInt(Foo.STARTING_PRICE))

        assert(this.checkSig(sig, this.auctioneer), 'sighature check failed')
    }

    @method()
    public bid(bidder: PubKey, bid: bigint) {
        console.log(`isAcutioning = ${this.isAuctioning}`)
        assert(this.isAuctioning, 'Currently not in an auction state.')
        const highestBid: bigint = this.ctx.utxo.value

        assert(
            bid > highestBid,
            'the auction bid is lower than the current highest bid'
        )

        const higestBidder: PubKey = this.bidder
        this.bidder = bidder

        // Auction continues with a higher bidder.
        const auctionOutput: ByteString = this.buildStateOutput(bid)

        // Refund previous highest bidder.
        const refundOutput: ByteString = Utils.buildPublicKeyHashOutput(
            hash160(higestBidder),
            highestBid
        )

        const outputs: ByteString = auctionOutput + refundOutput

        assert(
            hash256(outputs) == this.ctx.hashOutputs,
            'hashOutputs check failed'
        )
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

    static beginAuctionTxBuilder(
        current: Foo,
        options: MethodCallOptions<Foo>,
        sig: Sig
    ): Promise<ContractTransaction> {
        const nextInstance = current.next()

        const unsignedTx: Transaction = new Transaction()
            .addInput(current.buildContractInput(options.fromUTXO))
            .addOutput(
                new Transaction.Output({
                    script: nextInstance.lockingScript,
                    satoshis: 100000,
                })
            )

        return Promise.resolve({
            tx: unsignedTx,
            atInputIndex: 0,
            nexts: [
                {
                    instance: nextInstance,
                    atOutputIndex: 0,
                    balance: 100000,
                },
            ],
        })
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

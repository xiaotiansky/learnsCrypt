import { Foo } from '../../src/contracts/foo'
import { getDefaultSigner, sleep } from './util/txHelper'
import { MethodCallOptions, StatefulNext } from 'scrypt-ts'
import { isAnyArrayBuffer } from 'util/types'
import { Transaction } from 'bsv'

function createNextOutputs(current: Foo, preOutputIndex: bigint) {
    const nextOutputs = new Array(Foo.OUTPUTS_COUNT).fill(1).map((_, i) => {
        const next = current.next() //update state
        next.preOutputIndex = preOutputIndex
        return {
            instance: next,
            atOutputIndex: i,
            balance: 1,
        }
    })
    return nextOutputs
}

async function doProcess(
    current: Foo,
    preOutputIndex: bigint
): Promise<{
    nexts: StatefulNext<Foo>[]
}> {
    await sleep(3)
    const { tx, nexts } = await current.methods.process({
        next: createNextOutputs(current, preOutputIndex),
    })

    console.log('Foo call tx : ', tx.id)

    return Promise.resolve({
        nexts: nexts,
    })
}

// Define a mapping object that maps characters to numbers and characters
const charNumMap = new Map<string, number>([
    ['.', 0],
    ['0', 1],
    ['1', 2],
    ['2', 3],
    ['3', 4],
    ['4', 5],
    ['5', 6],
    ['6', 7],
    ['7', 8],
    ['8', 9],
    ['9', 10],
    ['a', 11],
    ['b', 12],
    ['c', 13],
    ['d', 14],
    ['e', 15],
    ['f', 16],
    ['g', 17],
    ['h', 18],
    ['i', 19],
    ['j', 20],
    ['k', 21],
    ['l', 22],
    ['m', 23],
    ['n', 24],
    ['o', 25],
    ['p', 26],
    ['q', 27],
    ['r', 28],
    ['s', 29],
    ['t', 30],
    ['u', 31],
    ['v', 32],
    ['w', 33],
    ['x', 34],
    ['y', 35],
    ['z', 36],
    ['-', 37],
])

// Define a function that takes a DNS string as input and returns an array of corresponding numbers
function convertDnsToArray(dns: string): number[] {
    // Add a '.' in front of the DNS string,
    dns = '.' + dns + '..'

    // Split the DNS string into an array of characters
    const dnsChars = dns.split('')

    // Map each character to its corresponding number using charNumMap
    const dnsNumArray = dnsChars.map((char) => {
        const num = charNumMap.get(char)
        if (num === undefined) {
            throw new Error(`Invalid character in DNS: ${char}`)
        }
        return num
    })

    console.log(dnsNumArray)

    return dnsNumArray
}

// Define a function that takes an array of numbers as input and returns the corresponding DNS string
function convertArrayToDns(array: number[]): string {
    // Define an empty string to store the DNS string
    let dns = ''

    // Loop through each number in the array and map it to its corresponding character using charNumMap
    for (let i = 0; i < array.length; i++) {
        const char = Array.from(charNumMap.keys())[
            Array.from(charNumMap.values()).indexOf(array[i])
        ]
        if (char === undefined) {
            throw new Error(`Invalid number in array: ${array[i]}`)
        }
        dns += char
    }

    // Add a '.' at the beginning of the dns string and '..' at the end
    dns = '.' + dns + '..'

    return dns
}

async function registerDNS(dns: string) {
    // Call the convertDnsToArray function with the dns argument to get the dnsNumArray
    const dnsNumArray = convertDnsToArray(dns)

    await Foo.compile()
    // create a genesis instance
    const foo = new Foo(0n)

    foo.bindTxBuilder('process', Foo.processTxBuilder)

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
}

describe('Test SmartContract `Foo` on testnet', () => {
    it('should succeed', async () => {
        await registerDNS('dot.com')
        await registerDNS('yunian--')
    })
})

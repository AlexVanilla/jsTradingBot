const Alpaca = require('@alpacahq/alpaca-trade-api')
const alpacaHelpers = require('./alpaca')

let minSMA = {}
let daySMA = {}

const alpaca = new Alpaca({
    keyId: process.env.ALPACA_KEY_ID,
    secretKey: process.env.ALPACA_SECRET_KEY,
    paper: true,
})

const client = alpaca.websocket
client.onConnect(async function () {
    console.log("Connected")
    // https://alpaca.markets/docs/api-documentation/api-v2/market-data/streaming/
    // client.subscribe(['trade_updates', 'account_updates', 'T.FB', 'Q.AAPL', 'A.FB', 'AM.AAPL'])
    client.subscribe(['trade_updates', 'account_updates', 'AM.MSFT', 'AM.AEYE'])
    // client.subscribe(['trade_updates', 'account_updates'])

})
client.onDisconnect(() => {
    console.log("Disconnected")
})
client.onStateChange(newState => {
    console.log(`State changed to ${newState}`)
})
client.onOrderUpdate(data => {
    console.log(`Order updates: ${JSON.stringify(data)}`)
})
client.onAccountUpdate(data => {
    console.log(`Account updates: ${JSON.stringify(data)}`)
})
client.onStockTrades(function (subject, data) {
    console.log(`Stock trades: ${subject}, ${data}`)
})
client.onStockQuotes(function (subject, data) {
    console.log(`Stock quotes: ${subject}, ${data}`)
})
client.onStockAggSec(function (subject, data) {
    console.log(`Stock agg sec: ${subject}, ${data}`)
})
client.onStockAggMin(function (subject, data) {
    console.log(`Stock agg min: ${subject}, ${data}`)
})

async function test(subject, data) {
    // data should be the array
    let test = [{
        "ev": "AM",
        "sym": "MSFT",
        "v": 73600,
        "av": 7398420,
        "op": 180.62,
        "vw": 181.3467,
        "o": 181.36,
        "c": 181.365,
        "h": 181.41,
        "l": 181.28,
        "a": 181.1558,
        "z": 87,
        "n": 1,
        "s": 1588687860000,
        "e": 1588687920000
    }]

    // data = JSON.parse(test)


    // if subscribed to multiple, it gets them 1 at a time
    console.log(`Stock agg min: ${subject}, ${data}`)
    let thing = JSON.parse(data)

    let symbol = thing[0].sym
    let openPrice = thing[0].o
    openPrice = openPrice.toFixed(2)

    console.log(`symbol:  ${symbol}`)
    console.log(`unformatted open price:  ${openPrice}`)

    if(!minSMA[symbol]){
        minSMA[symbol] = []
    }

    // get the 5 day sma of stock to use as trade signal
    if(!daySMA[symbol]){
        console.log(`first time init`)
        // init5DSMA([symbol], 5)

        // FIXME: getting promises. 

        // use this if market is closed
        // symbol = 'MSFT'
            let sma = await alpacaHelpers.get5DSMA([symbol], 5).then(res => {
                console.log('RES!!!:', res)
                return res
            })
            // let sma = alpacaHelpers.get5DSMA(tickers, limit)
            console.log('the result!!!', sma)
            daySMA[symbol] = sma
    }

    console.log('daySMA', daySMA)


    if(minSMA[symbol].length > 5){
        minSMA[symbol].shift()
    }

    minSMA[symbol].push(openPrice)


    console.log(symbol + ' open price: ' + openPrice)

    // was planning to have minSMA do 5 min avg of prices.  don't think it's needed but this shows last 5 min open prices
    console.log('minSMA:  ', minSMA[symbol])
    // TODO: get o

    // depending on ticker symbol, get its sma. prob store sma info in excel to retrieve later
    console.log('getting 5day sma of:  ', symbol)
    console.log('daySMA:  ', daySMA[symbol])


    // if data.o is lower than the sma, buy

    // if it's higher sell stock



}

async function init5DSMA(tickers, limit){
    let sma = await alpacaHelpers.get5DSMA(tickers, limit)
    console.log(sma)
    daySMA[symbol] = sma
}

client.connect()
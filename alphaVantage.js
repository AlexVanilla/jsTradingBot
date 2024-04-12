// NOTE: Alpha vantage has limitation to free version
// 5 API requests per minute; 500 API requests per day

const helpers = require('./helpers');

require('dotenv').config()

console.log(process.env.ALPHA_VANTAGE_KEY)

const alpha = require('alphavantage')({
    key: process.env.ALPHA_VANTAGE_KEY
});

async function test() {
    // let result = await alpha.data.intraday('msft', 'full', 'json', '5min') // gives 1145 market data
    let result = await alpha.data.intraday('msft', 'full', 'csv', '5min') // gives 1145 market data
    // let result = await alpha.data.intraday('msft', 'compact', 'json', '5min') // gives 100 market data
    console.log(result)
    console.log(Object.keys(result['Time Series (5min)']).length)
    console.log(result['Time Series (5min)'])

    let alphaTimeSeries = result['Time Series (5min)']

    let alphaTimeSeriesArray = []
    // convert obj to array of obj to later convert to CSV
    for (const property in alphaTimeSeries) {
        let obj = {
            dateTime: property,
            open: alphaTimeSeries[property]['1. open'],
            high: alphaTimeSeries[property]['2. high'],
            low: alphaTimeSeries[property]['3. low'],
            close: alphaTimeSeries[property]['4. close'],
            volume: alphaTimeSeries[property]['5. volume'],
        }

        alphaTimeSeriesArray.push(obj)
    }

    console.log(alphaTimeSeriesArray)
    helpers.exportToCSV(alphaTimeSeriesArray, 'cheese')
    // helpers.exportToCSV(alphaTimeSeriesArray, 'MSFT_test')




    let testObj = {
        dateTime: '2020-05-22 12:15:00',
        open: '182.8600',
        high: '182.9300',
        low: '182.6700',
        close: '182.8700',
        volume: '173920'
    }

    console.log('object')
    // alpha.data.intraday('msft').then(data => {
    //     console.log(data)
    // })

    // let result = await alpha.data.intraday('msft')
    // console.log(result)


    // let rsiResult = await alpha.technical.rsi('msft', 'daily', 3, 'close')
    // console.log(rsiResult)

    // 5min


    // alpha.performance.sector().then(data => {
    //     console.log(data);
    // });


}


test()
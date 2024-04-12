'use strict'
const Papa = require('papaparse');
const fs = require('fs');




// sort array of stock objects with use of Array.sort() and this function.  Will sort by according to their symbol
function sortStocks(a, b) {
    const symbolA = a.symbol
    const symbolB = b.symbol

    let comparison = 0;
    if (symbolA > symbolB) {
        comparison = 1
    } else if (symbolA < symbolB) {
        comparison = -1
    }
    return comparison
}

const wait = ms => new Promise(
    (resolve, reject) => setTimeout(resolve, ms)
);

const parseDefaultCSV = () => {
    let str = fs.readFileSync("./zack1RankStocks.csv", 'utf8');
    return Papa.parse(str, {
        header: true
    });
}

const parseCSV = (filepath) => {
    let str = fs.readFileSync(filepath, 'utf8');
    return Papa.parse(str, {
        header: true,
        skipEmptyLines: true
    });
}

// Exports and array of objects and the file name as a CSV file
// params: requires array of objects and filename
function exportToCSV(arrayObject, fileName) {
    let processed = Papa.unparse(arrayObject)
    /*
    Object {
        dateTime: "2020-06-12 16:00:00",
        open: "188.0600",
        high: "188.5200",
        low: "187.4900",
        open: "188.0600",
        volume: "1430496"
    }
    */

    fs.writeFile(fileName + '.csv', processed, err => {
        if (err) {
            console.error(err)
            return err
        }
    })
}

// Takes on object with property exchange
const formatToAMEX = (exchange) => {
    if (exchange == 'ARCA' || exchange == 'BATS' || exchange == 'NYSEARCA') {
        return 'AMEX'
    }

    return exchange
}


// Returns stop price based on limit specified
// symbols need to have close price in order to calculate
// function getStopPrice(symbols, stopPrice) {
//     let stopLimit = 0.03 // Automatically sell if below %3

//     let stopPrice = lastClosePrice - (lastClosePrice * stopLimit)
//     stopPrice = stopPrice.toFixed(2
//     }

// TODO: need to test for sell
// THIS LOGGING FUNCTION REQUIRES ALPACA RESULTS (from the create order function)
const logTransaction = (results) => {
    // 'TODO: get stop price or stockprice if buying or selling'
    // 'TODO: get current date to sort later
    console.log(results)

    // Parse the transaction log
    let log = parseCSV('./transaction-logs.csv')
    let orders = log.data

    let newOrder = {
        clientOrderId: results.client_order_id,
        createdAt: results.created_at,
        id: results.id,
        qty: results.qty,
        side: results.side,
        submittedAt: results.submitted_at,
        symbol: results.symbol,
        timeInForce: results.time_in_force,
        type: results.type,
        updatedAt: results.updated_at
    }

    orders.push(newOrder)

    // After appending the new order, update the csv file
    exportToCSV(orders, 'transaction-logs')
}

module.exports = {
    sortStocks,
    wait,
    parseDefaultCSV,
    parseCSV,
    exportToCSV,
    formatToAMEX,
    logTransaction
    // getStopPrice
}
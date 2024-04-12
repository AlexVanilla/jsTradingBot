'use strict'

const api = require('./zackCall')
const tv = require('./tradingView')
// import * as tv from 'tradingView'
const Papa = require('papaparse');
const fs = require('fs');
const helpers = require('./helpers')


// const main = async () => {

// params tickers - String[] 
// accept array of objects (the stock's info.  req - symbol and exchange name)
async function buildInfosObject(stocks) {


	let portfolioStatus = [];

	for (let stock of stocks) {

		let result = await api.getData(stock.symbol).then(res => {
			// if (parseInt(res.zacksRank) > 3) {
			// 	console.log("WARNING:  " + res.ticker + " is greater than 3.  Rank: " + res.zacksRank + "/5")
			// 	console.log("Higher the number, more recommended to sell")
			// }

			return res;
		}).catch(err => err);


		portfolioStatus.push(result);
	}



	let concatTickersExchange = []
	for (let stock of stocks) {
		// concatTickersExchange.push(stock.exchange + ":" + stock.ticker);
		if(!stock.exchange) {
			console.log('Exchange not found !!!')
		} else {
			// helpers.formatToAMEX(stock.exchange)
			concatTickersExchange.push(stock.exchange + ":" + stock.symbol);
		}
	}

	// getTechnicalAnalysisInfo will return an array
	let day1TA = await tv.getTechnicalAnalaysisInfo(concatTickersExchange).catch(err => {
		console.log(err)
	})
	let week1TA = await tv.getTechnicalAnalaysisInfo(concatTickersExchange, "1W").catch(err => {
		console.log(err)
	})
	let month1TA = await tv.getTechnicalAnalaysisInfo(concatTickersExchange, "1M").catch(err => {
		console.log(err)
	})

	let infos = []

	// NOTE: this loop requires that all the arrays align with their respective stocks.  Refer to helper.sortStocks()
	let missingStocks = portfolioStatus.filter(e => {
		// day1TA.includes(e.ticker)
		return !day1TA.some(el => {
			return el.symbol === e.symbol
		});

	})

	console.log(missingStocks)
	if (missingStocks.length != 0) {
		console.log(`Technical Analysis info weren't found found for the following stocks`)
		console.log(missingStocks)

		// Input info to missing value and add to portfolio status
		let stock
		for (stock of missingStocks) {
			let newObjTA1D = {
				s: stock.exchange + ":" + stock.ticker,
				d: [],
				technicalAnalysis1D: {
					oscillator1D: {
						status: null,
						value: null
					},
					summary1D: {
						status: null,
						value: null
					},
					movingAverages1D: {
						status: null,
						value: null
					}
				},
				ticker: stock.ticker
			}

			let newObjTA1W = {
				s: stock.exchange + ":" + stock.ticker,
				d: [],
				technicalAnalysis1W: {
					oscillator1W: {
						status: null,
						value: null
					},
					summary1W: {
						status: null,
						value: null
					},
					movingAverages1W: {
						status: null,
						value: null
					}
				},
				ticker: stock.ticker,
			}

			let newObjTA1M = {
				s: stock.exchange + ":" + stock.ticker,
				d: [],
				technicalAnalysis1M: {
					oscillator1M: {
						status: null,
						value: null
					},
					summary1M: {
						status: null,
						value: null
					},
					movingAverages1M: {
						status: null,
						value: null
					}
				},
				ticker: stock.ticker,
			}

			day1TA.push(newObjTA1D)
			week1TA.push(newObjTA1W)
			month1TA.push(newObjTA1M)
		}
	}

	day1TA.sort(helpers.sortStocks)
	week1TA.sort(helpers.sortStocks)
	month1TA.sort(helpers.sortStocks)
	portfolioStatus.sort(helpers.sortStocks)

	for (let i = 0; i < portfolioStatus.length; i++) {

		// need to combine the correct TA to correct portfolio stock

		// Grab all the TA info to push into info
		let technicalAnalysis1D
		let technicalAnalysis1W
		let technicalAnalysis1M

		try {
			technicalAnalysis1D = day1TA[i].technicalAnalysis1D
			technicalAnalysis1W = week1TA[i].technicalAnalysis1W
			technicalAnalysis1M = month1TA[i].technicalAnalysis1M
		} catch (error) {
			console.log(error)
			// throw new Error(error)
		}


		// TODO: for getting Complete Info, need to destructure oscillator1D, summary1D, etc etc to seperate params and values so exporting to CSV won't cause [object object] output
		let obj = {
			...technicalAnalysis1D,
			...technicalAnalysis1W,
			...technicalAnalysis1M,
			...portfolioStatus[i]
		}

		// format
		delete obj.d
		delete obj.s

		// Just grabbing exchange info from day1TA
		obj['exchange'] = day1TA[i].exchange
		infos.push(obj)
	}

	return infos
}


async function getCompleteStockStatus(stocks) {
	let infos = await buildInfosObject(stocks)
	console.table(infos)
	return infos
}

// Need obj with symbol and exchange
async function getBriefStockStatus(stocks) {
	let infos = await buildInfosObject(stocks)

	let summaryInfo = []
	for (let info of infos) {
		let obj = {
			symbol: info.symbol,
			exchange: info.exchange,
			name: info.name,
			zacksRankText: info.zacksRankText,
			summary1DStatus: info.summary1D.status,
			summary1WStatus: info.summary1W.status,
			summary1MStatus: info.summary1M.status
		}

		summaryInfo.push(obj)
	}

	console.table(summaryInfo)
	return summaryInfo
}

// let stonks = helpers.parseCSV('./america_2020-06-02.csv')
// getBriefStockStatus(stonks.data)

module.exports = {
	getBriefStockStatus: getBriefStockStatus,
	getCompleteStockStatus: getCompleteStockStatus,
}
const puppeteer = require('puppeteer')
const fs = require('fs')

const initialize = async () => {

	let searchkey = 'how to check if user closed tab';

	const generateId = () => Buffer.from(`${Date.now()}`).toString('base64')

	const google = (search) => new Promise(async (resolve, reject) => {
		const browser = await puppeteer.launch()

		try {
			const page = await browser.newPage()
			await page.goto("https://www.google.com/")
			await page.type("input[title='Search']", `${search}\r`)
		
			// await page.waitForSelector("div#search", { visible: true, timeout: 60000 })
			await page.waitForSelector("div[data-hveid] div.yuRUbf > a", { visible: true, timeout: 60000 })
		
			let searchLinks = await page.$$eval("div[data-hveid] div.yuRUbf > a", links => links.map(a => a.getAttribute('href')))

			resolve({
				searchEngine: 'google',
				searchLinks
			})
		} catch (error) {
			reject(error)
		} finally {
			await browser.close()
		}
	})

	const bing = (search) => new Promise(async (resolve, reject) => {
		const browser = await puppeteer.launch()

		try {
			const page = await browser.newPage()
			await page.goto("https://www.bing.com/")
			await page.type("input#sb_form_q", `${search}\r`)

			await page.waitForSelector("ol#b_results", { visible: true, timeout: 60000 })

			let searchLinks = await page.$$eval("ol#b_results > li.b_algo > h2 > a", links => links.map(a => a.getAttribute('href')))
			
			resolve({
				searchEngine: 'bing',
				searchLinks
			})
		} catch (error) {
			reject(error)
		} finally {
			await browser.close()
		}
	})

	const webcrawler = async (searchinfo) => {
		let info = {};
		let id = generateId()
		let path = './searchscreenshots';
		let filepath = `${path}/${id}`;

		// fix data formatting
		for (let item of searchinfo) {
			info[item.searchEngine] = item.searchLinks
		}

		console.log(info)

		fs.access(filepath,  error => {
			if (error) {
				// directory does not exists
				fs.mkdir(filepath, { recursive: true }, err => {
					if (err) {
						console.log(err)
					}
				})
			}
		})

		const linkCrawl = async (resolve, reject, link, screenshotPath, engine, idx) => {
			const browser = await puppeteer.launch()

			try {
				const page = await browser.newPage()
				await page.goto(link, {
					waitUntil: 'load',
					timeout: 0
				})
				await page.waitForTimeout(500)
				await page.screenshot({ path: `${screenshotPath}/${engine}-${idx}.png`, fullPage: true })

				resolve(true)
			} catch (error) {
				reject(error)
			} finally {
				await browser.close()
			}
		}

		// iterate over each search engine
		for (let [key, links] of Object.entries(info)) {
			
			console.log(`crawling ${key} search results`)

			let linkPromises = []

			// create queueing system to limit cpu usage and avoid errors
			for (let link of links) {
				linkPromises.push(new Promise((resolve, reject) => linkCrawl(resolve, reject, link, filepath, key, links.indexOf(link))))
			}

			let results = await Promise.all(linkPromises)
			console.log(results)
		}
	}

	try {
		let searchResults = await Promise.all([ google(searchkey), bing(searchkey) ])
		webcrawler(searchResults)
	} catch (error) {
		console.log(error)
	}
}

initialize()
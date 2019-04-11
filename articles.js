/*
wt create articles.js --name progress-articles --secret WEBFLOW=c7a632cd5977189a4fd1d6812459af14b64b7f6c056cc11e6c2f1242ada4f2c0 --parse-body
*/

const Sheetsu = require('sheetsu-node')
const Webflow = require('webflow-api')

module.exports = (body, callback) => {
 
	const ids = {
		site: '56b26b90d28b886833e7a042',
		collections: {
			articles: '56b2bbecbdb30c907c8f6353',
			authors: '56b26b90d28b886833e7a056',
			categories: '56b26b90d28b886833e7a058',
			tags: '56b8fce9075f9ea44d2f0f55'
		}
	}

	const sheetsu = Sheetsu({ address: 'https://sheetsu.com/apis/v1.0su/9920a6e03ccf' })
	const webflow = new Webflow({ token: body.secrets.WEBFLOW })
	
	// Cycle through collection to get each field ID
	/*
		const items = webflow.items({ collectionId: ids.collections.articles })
		items.then(i => console.log(i.items[0]))
	*/

	// Cycle through collection to get each item ID
	/*
		const items = webflow.items({ collectionId: ids.collections.tags })
		items.then(i => {
			i.items.forEach(item => console.log(item['_id'], item['name']))
		})
	*/

	// STEP 1: Get spreadsheet data
	// /*
	sheetsu.read()
		.then(sheetArticlesJson => {
      const sheetArticles = JSON.parse(sheetArticlesJson)
      
      // STEP 2: Create article in Webflow
      for (let row = 0; row < sheetArticles.length; row++) {
        const sheetArticle = sheetArticles[row]
        console.log(sheetArticle)
      }

      /*
			// STEP 2: Get articles from Webflow
			const wfArticlesCollection = webflow.items({ collectionId: ids.collections.articles })
			wfArticlesCollection.then(i => {

				const wfArticles = i.items

				// STEP 3: Cycle through each Webflow article and update article with sheet data. Add slight timeout since `JSON.parse(sheetArticlesJson)` appears to be async.
				setTimeout(() => {
					for (let wfRow = 0; wfRow < wfArticles.length; wfRow++) {
						const wfArticle = wfArticles[wfRow]

						// Find sheet article by Webflow’s ID
						const sheetArticle = sheetArticles.filter(sheetArticle => sheetArticle['_id'] === wfArticle['_id'])[0]

						// Create image object and teachers array
						const updatedSheetArticle = {
							...sheetArticle,
							'image': { fileId: '', url: sheetArticle['image-url'] }
							// 'open-graph-images': { fileId: '', url: sheetArticle['og-image-url'] }
						}

						// Combine Webflow article with sheet article, but give preference to sheet values
						let updatedArticle = {
							...wfArticle,
							...updatedSheetArticle
						}

						// Remove key/values that cannot be updated in Webflow
						delete updatedArticle['']
						delete updatedArticle['_id']
						delete updatedArticle['image-url']
						delete updatedArticle['og-image-url']
						delete updatedArticle['updated-on']
						delete updatedArticle['updated-by']
						delete updatedArticle['created-on']
						delete updatedArticle['created-by']
						delete updatedArticle['published-on']
						delete updatedArticle['published-by']
            updatedArticle['_archived'] = false
            updatedArticle['_draft'] = false

						// Update Webflow
						const updateWfArticle = webflow.updateItem({
							collectionId: ids.collections.articles,
							itemId: wfArticle['_id'],
							fields: updatedArticle
						})

						// Add timeout to circumvent 60 items per minute rate limitation
						setTimeout(() => {
							updateWfArticle
								// END
								.then(i => {
									console.log('Updated article: ' + updatedArticle['name'])
									if (wfRow === wfArticles.length - 1) {
										callback(null, {
											done: 'Webflow should now be updated. Please refresh Webflow to see the results.'
										})
									}
								})
								.catch(err => {
									console.log('Error with article: ' + updatedArticle['name'])
									console.error(err)
									callback(null, {
										error: {
											article: updatedArticle['name'],
											message: err.msg,
											problem: err.problems
										}
									})
								})
						}, 2000)

					}
				}, 1000)

      })
      */

		})
		.catch(err => console.error(err))
		// */

}
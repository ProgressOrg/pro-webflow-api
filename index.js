/*
wt create index.js --name progress-webflow --secret SENDGRID=__TOKEN__ --secret WEBFLOW=__TOKEN__ --secret APPLE_NEWS_KEY= __TOKEN__ --secret APPLE_NEWS_SECRET=__TOKEN__ --parse-body && wt logs
*/
module.exports = (body, callback) => {

	const Webflow = require('webflow-api')
	const moment = require('moment')
	const appleNewsAPI = require('apple-news')

	const webflow = new Webflow({ token: body.secrets.WEBFLOW })

	const ids = {
		site: '56b26b90d28b886833e7a042',
		collections: {
			articles: '56b2bbecbdb30c907c8f6353',
			authors: '56b26b90d28b886833e7a056',
			categories: '56b26b90d28b886833e7a058',
			tags: '56b8fce9075f9ea44d2f0f55'
		}
	}

	const webhooks = webflow.webhooks({ siteId: ids.site })
	webhooks.then(hook => {

		// Only run this webhook if the site got published
		if (hook[0].triggerType === 'site_publish') {

			// Site has been published, so get most recent item...
			const items = webflow.items({ collectionId: ids.collections.articles }, { limit: 1 })
			items.then(i => {

				const item = i.items[0]

				// CHAPTER I
				// !!! Only send this via email if it hasn’t already been sent! We do not want to spam email recipients.
				if (!item.email) {


					// STEP 1: Prepare email text
					const { name, date, text, slug, author } = item
					const whyItMatters = item['why-it-matters']
					const imageUrl = item.image.url
	
					const authorDetails = webflow.item({ collectionId: '56b26b90d28b886833e7a056', itemId: author })
					authorDetails.then(a => {
	
						const authorName = a.name
						const authorPhoto = a.picture.url
						const authorTitle = a.title
						const authorUrl = 'https://www.progress.org/authors/' + a.slug
	
						let copyrightYear = new Date(date)
						const year = copyrightYear.getFullYear()
						const copyright = authorName === 'Fred Foldvary, Ph.D.'
							? `.<br />All rights reserved.`
							: ` under a <a href='https://creativecommons.org/licenses/by-nc-nd/4.0/legalcode' style='color:#120065; text-decoration:none;'>Creative Commons</a> copyright. Some rights reserved.`
	
						const html = `
						<div style='max-width:100%; width:600px; margin:0 auto; font-family:Arial,sans-serif;'>
							<a href='https://www.progress.org/' style='color:#120065; text-decoration:none;'>
								<div style='background-image:url("https://uploads-ssl.webflow.com/56b26b90d28b886833e7a042/5c9b1f8bbcc30e90ca392d94_progress-logo-flat-subtitle.png"); background-repeat:no-repeat; background-position:center center; background-size:contain; width:100%; height:200px; margin:0 auto;' />
							</a>
							<a href='https://www.progress.org/articles/${slug}' style='color:#120065; text-decoration:none;'>
								<div style='background-image:url("${imageUrl}"); background-repeat:no-repeat; background-position:center center; background-size:cover; width:100%; height:300px; margin:0 auto;' />
								<p style='font-weight:600; color:#333; font-size:36px; text-align:center;'>${name}</p>
								<p style='font-weight:400; color:#333; font-size:24px; text-align:center; font-style:italic;'>${whyItMatters}</p>
								<p style='font-weight:400; color:#333; font-size:18px; text-align:center;'>${moment(date).format('MMMM Do YYYY')}</p>
							</a>
							<p style='font-weight:400; color:#333; font-size:18px;'><span style='float:left;'>By</span><span style='float:left; margin-left:5px; background-image:url("${authorPhoto}"); background-repeat:no-repeat; background-position:center center; background-size:contain;' /><span style='margin-left:5px; float:left;'><a href='${authorUrl}' style='color:#120065; text-decoration:none;'>${authorName}, ${authorTitle}</a></span></p><br /><br />
							<div style='font-weight:400; color:#333; font-size:18px; line-height: 26px;'>${text}</div>
							<p style='font-weight:400; color:#888; font-size:12px; text-align:center;'>
								© Text Copyright ${year} ${authorName}${copyright}<br />
								Published at <a href='https://www.progress.org/articles/${slug}' style='color:#120065; text-decoration:none;'>Progress.org</a> | <a href='<%asm_global_unsubscribe_raw_url%>' style='color:#120065; text-decoration:none;'>Unsubscribe</a>
							</p>
						</div>
						`


		
						// STEP 2: Get all emails
						const sgClient = require('@sendgrid/client')
						sgClient.setApiKey(body.secrets.SENDGRID)

						const sgMail = require('@sendgrid/mail')
						sgMail.setApiKey(body.secrets.SENDGRID)

						sgClient.request({
							method: 'GET',
							url: '/v3/contactdb/recipients'
						})
							.then(([response, body]) => {
								// If all good...
								if (response.statusCode === 200) {
									// ...go ahead and email everyone that’s NOT unsubscribed
									body.recipients.forEach(({ first_name, last_name, email }) => {

										// STEP 3: Email each subscriber
										const recipient = first_name && last_name
											? first_name + ' ' + last_name + '<' + email + '>'
											: email
										sgMail.send({
											to: recipient,
											from: 'Progress.org <info@progress.org>',
											subject: name + ', by ' + authorName,
											text: 'A new article got published! Visit https://www.progress.org/articles/' + slug,
											html,
											asm: {
												group_id: 9735,
												groups_to_display: [9735, 9736, 9737]
											}
										})
											.then(() => console.log('***\nEmail with subject “' + name + ', by ' + authorName + '“ sent to ' + email + '.\n***'))
											.catch(err => console.error(err.toString()))
									})

									// STEP 4: Tell Webflow to never email this article again
									// Set `email` field in Webflow to TRUE to prevent multiple emails from being sent.
									let itemToUpdate = { ...item, email: true }
									delete itemToUpdate['_id']
									delete itemToUpdate['updated-on']
									delete itemToUpdate['updated-by']
									delete itemToUpdate['created-on']
									delete itemToUpdate['created-by']
									delete itemToUpdate['published-on']
									delete itemToUpdate['published-by']

									const updateItem = webflow.updateItem({
										collectionId: ids.collections.articles,
										itemId: item._id,
										fields: {
											...itemToUpdate
										}
									})
									updateItem
										// END
										.then(i => console.log(i))
										.catch(err => console.error(err))

								}
							})

					})
				}

				// CHAPTER II: Apple News
				if (!item['apple-news']) {
					// https://github.com/micnews/apple-news
					const appleNews = appleNewsAPI({
						apiId: body.secrets.APPLE_NEWS_KEY,
						apiSecret: body.secrets.APPLE_NEWS_SECRET
					})
					appleNews.readChannel({ channelId: 'bbad4067-5c65-4a3b-808e-389a5439274a' }, (err, data) => err ? err : console.log(data))
				}

				// CHAPTER III: Google News
				if (!item['google-news']) {

				}

				// CHAPTER IV: END
				let complete = false
				if (complete) {
					callback()
				}

			})

		}
		else {
			console.log('Duplicate')
		}

	})

}
/*
wt create pro-webflow-api.js --secret SENDGRID=__TOKEN__ --secret WEBFLOW=__TOKEN__ --parse-body
*/
module.exports = (body, callback) => {

	const Webflow = require('webflow-api')
	const moment = require('moment')
	const webflow = new Webflow({ token: body.secrets.WEBFLOW })
	const siteId = '56b26b90d28b886833e7a042'

	let globalHook = ''

	const webhooks = webflow.webhooks({ siteId })
	webhooks.then(hook => {

		console.log(hook[0].triggerId)
		if (globalHook !== hook[0].triggerId && hook[0].triggerType === 'site_publish') {

			// Site has been published, so get most recent item...
			const items = webflow.items({ collectionId: '56b2bbecbdb30c907c8f6353' }, { limit: 1 })
			items.then(i => {
				const { name, date, text, slug, author } = i.items[0]
				const whyItMatters = i.items[0]['why-it-matters']
				const imageUrl = i.items[0].image.url

				const authorDetails = webflow.item({ collectionId: '56b26b90d28b886833e7a056', itemId: author })
				authorDetails.then(a => {

					const authorName = a.name
					const authorPhoto = a.picture.url
					const authorTitle = a.title
					const authorUrl = 'https://www.progress.org/authors/' + a.slug

					const copyright = authorName === 'Fred Foldvary, Ph.D.'
						? `.<br />All rights reserved.`
						: ` under a <a href='https://creativecommons.org/licenses/by-nc-nd/4.0/legalcode' style='color:#120065; text-decoration:none;'>Creative Commons</a> copyright. Some rights reserved.`

					const html = `
					<div style='max-width:100%; width:600px; margin:0 auto;'>
						<div style='background-image:url("https://uploads-ssl.webflow.com/56b26b90d28b886833e7a042/5c9b1f8bbcc30e90ca392d94_progress-logo-flat-subtitle.png"); background-repeat:no-repeat; background-position:center center; background-size:contain; width:100%; height:200px; margin:0 auto;' />
						<div style='background-image:url("${imageUrl}"); background-repeat:no-repeat; background-position:center center; background-size:cover; width:100%; height:300px; margin:0 auto;' />
						<p style='font-weight:600; color:#333; font-size:36px; text-align:center;'>${name}</p>
						<p style='font-weight:400; color:#333; font-size:24px; text-align:center; font-style:italic;'>${whyItMatters}</p>
						<p style='font-weight:400; color:#333; font-size:18px; text-align:center;'>${moment(date).format('MMMM Do YYYY')}</p>
						<p style='font-weight:400; color:#333; font-size:18px;'><span style='float:left;'>By</span><span style='float:left; margin-left:5px; background-image:url("${authorPhoto}"); background-repeat:no-repeat; background-position:center center; background-size:contain;' /><span style='margin-left:5px; float:left;'><a href='${authorUrl}' style='color:#120065; text-decoration:none;'>${authorName}, ${authorTitle}</a></span></p><br /><br />
						<div style='font-weight:400; color:#333; font-size:18px;'>${text}</div>
						<p style='font-weight:400; color:#333; font-size:14px; text-align:center;'>
							© Text Copyright 2019 ${authorName}${copyright} Published at <a href='https://www.progress.org/articles/${slug}' style='color:#120065; text-decoration:none;'>Progress.org</a><br />
							<span style='font-size:14px !important; text-decoration:none !important; color:#333 !important;'><%asm_group_unsubscribe_url%></span>
						</p>
					</div>
					`
	
					const sgMail = require('@sendgrid/mail')
					sgMail.setApiKey(body.secrets.SENDGRID)
					const msg = {
						to: 'martin@martinadams.com',
						from: 'Progress.org <info@progress.org>',
						subject: name + ', by ' + authorName,
						text: 'A new article got published! visit https://www.progress.org/articles/' + slug,
						html,
						asm: {
							group_id: 9735,
							groups_to_display: [9734, 9735, 9736, 9737]
						}
					};
					sgMail.send(msg)
						.then(() => {
							console.log('***\nEmail with subject “' + name + ', by ' + authorName + '“ sent.\n***')
							// Make sure email doesn’t get sent again
							globalHook = hook[0].triggerId
						})
						.catch(err => console.error(err.toString()))

				})

			})

		}
		else {
			console.log('Duplicate')
		}

	})

}